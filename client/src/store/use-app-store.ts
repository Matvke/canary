import { create } from 'zustand'

import { db } from '@/data/db'
import { createDemoPlanBundle, DEFAULT_TEMPLATES } from '@/data/demo'
import { fetchTodayPlan, submitInspection, uploadPhoto } from '@/lib/api'
import {
  chooseNextEquipmentId,
  createDraft,
  createNotice,
  getSourceLabel,
  makeDraftId,
  normalizeQrCode,
  nowIso,
  safeVibrate,
  toErrorMessage,
} from '@/lib/app-utils'
import { getFieldError, validateDraft } from '@/lib/validation'
import type {
  ChecklistTemplate,
  DailyPlan,
  EquipmentRecord,
  InspectionDraft,
  InspectionPhoto,
  MetaRecord,
  QueueItem,
  SortMode,
  SyncIndicator,
} from '@/types'

interface Notice {
  message: string
  tone: 'ok' | 'defect' | 'info' | 'error'
}

interface SyncSummary {
  failed: number
  pending: number
  syncing: boolean
  lastSyncAt?: string
}

interface AppState {
  initialized: boolean
  initializing: boolean
  loading: boolean
  online: boolean
  sortMode: SortMode
  plan: DailyPlan | null
  equipment: Record<string, EquipmentRecord>
  templates: Record<string, ChecklistTemplate>
  drafts: Record<string, InspectionDraft>
  selectedEquipmentId: string | null
  currentDraft: InspectionDraft | null
  notice: Notice | null
  sync: SyncSummary
  bootstrap: () => Promise<void>
  refreshPlan: () => Promise<void>
  selectEquipment: (equipmentId: string) => Promise<void>
  updateChecklistValue: (itemId: string, value: string | boolean | null) => Promise<void>
  updateResultStatus: (status: InspectionDraft['resultStatus']) => Promise<void>
  handleQrScan: (code: string) => Promise<{ matched: boolean; message: string }>
  addPhotos: (files: FileList | File[]) => Promise<void>
  removePhoto: (photoId: string) => Promise<void>
  completeInspection: () => Promise<{ ok: boolean; message: string }>
  syncQueue: () => Promise<void>
  retryFailed: () => Promise<void>
  setOnline: (online: boolean) => void
  setSortMode: (sortMode: SortMode) => void
  dismissNotice: () => void
}

function indexById<T extends { id: string }>(items: T[]): Record<string, T> {
  return items.reduce<Record<string, T>>((accumulator, item) => {
    accumulator[item.id] = item
    return accumulator
  }, {})
}

async function ensureTemplates(): Promise<Record<string, ChecklistTemplate>> {
  const existing = await db.templates.toArray()
  if (existing.length === 0) {
    await db.templates.bulkPut(DEFAULT_TEMPLATES)
    return indexById(DEFAULT_TEMPLATES)
  }

  return indexById(existing)
}

async function summarizeQueue(syncing = false): Promise<SyncSummary> {
  const queueItems = await db.queue.toArray()
  const lastSync = queueItems
    .filter((item) => item.status === 'synced')
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0]

  return {
    pending: queueItems.filter((item) => item.status === 'pending').length,
    failed: queueItems.filter((item) => item.status === 'failed').length,
    syncing,
    lastSyncAt: lastSync?.updatedAt,
  }
}

function getTemplateForEquipment(
  equipment: EquipmentRecord,
  templates: Record<string, ChecklistTemplate>,
): ChecklistTemplate {
  return templates[equipment.checklistTemplateId] ?? DEFAULT_TEMPLATES[0]
}

async function persistMeta<T>(key: string, value: T): Promise<void> {
  const meta: MetaRecord<T> = { key, value }
  await db.meta.put(meta)
}

async function getStoredSelection(): Promise<string | null> {
  const meta = await db.meta.get('selected-equipment')
  return typeof meta?.value === 'string' ? meta.value : null
}

function getDefaultSelection(
  plan: DailyPlan | null,
  drafts: Record<string, InspectionDraft>,
  storedSelection: string | null,
): string | null {
  if (!plan || plan.items.length === 0) {
    return null
  }

  if (storedSelection && plan.items.some((item) => item.equipmentId === storedSelection)) {
    return storedSelection
  }

  const inProgress = Object.values(drafts).find((draft) => !draft.completedAt)
  if (inProgress) {
    return inProgress.equipmentId
  }

  return plan.items[0]?.equipmentId ?? null
}

async function reconcileDraftSyncStatus(): Promise<Record<string, InspectionDraft>> {
  const [drafts, queue] = await Promise.all([db.drafts.toArray(), db.queue.toArray()])
  const byDraftId = queue.reduce<Record<string, QueueItem[]>>((accumulator, item) => {
    const items = accumulator[item.draftId] ?? []
    items.push(item)
    accumulator[item.draftId] = items
    return accumulator
  }, {})

  const nextDrafts: InspectionDraft[] = []
  for (const draft of drafts) {
    const related = byDraftId[draft.id] ?? []
    let syncStatus: SyncIndicator = draft.completedAt ? 'saved_locally' : 'saved_locally'

    if (related.some((item) => item.status === 'failed')) {
      syncStatus = 'error'
    } else if (related.some((item) => item.status === 'syncing')) {
      syncStatus = 'syncing'
    } else if (related.some((item) => item.status === 'pending')) {
      syncStatus = 'saved_locally'
    } else if (draft.completedAt && related.some((item) => item.status === 'synced')) {
      syncStatus = 'synced'
    }

    if (syncStatus !== draft.syncStatus) {
      nextDrafts.push({ ...draft, syncStatus })
    }
  }

  if (nextDrafts.length > 0) {
    await db.drafts.bulkPut(nextDrafts)
  }

  return indexById(await db.drafts.toArray())
}

async function writeDraft(draft: InspectionDraft, drafts: Record<string, InspectionDraft>): Promise<Record<string, InspectionDraft>> {
  await db.drafts.put(draft)
  return {
    ...drafts,
    [draft.id]: draft,
  }
}

async function loadCurrentDraft(
  plan: DailyPlan | null,
  equipmentMap: Record<string, EquipmentRecord>,
  templates: Record<string, ChecklistTemplate>,
  equipmentId: string,
): Promise<InspectionDraft | null> {
  if (!plan) {
    return null
  }

  const equipment = equipmentMap[equipmentId]
  if (!equipment) {
    return null
  }

  const draftId = makeDraftId(plan.id, equipmentId)
  const existing = await db.drafts.get(draftId)
  if (existing) {
    return existing
  }

  const nextDraft = createDraft(plan.id, equipment, getTemplateForEquipment(equipment, templates))
  await db.drafts.put(nextDraft)
  return nextDraft
}

async function ensurePlanData(): Promise<{ plan: DailyPlan; equipment: EquipmentRecord[] }> {
  const remoteBundle = await fetchTodayPlan()
  const plan = remoteBundle.plan.source === 'demo'
    ? remoteBundle.plan
    : { ...remoteBundle.plan, source: 'remote' as const }

  await db.transaction('rw', db.plans, db.equipment, async () => {
    await db.plans.put(plan)
    await db.equipment.bulkPut(remoteBundle.equipment)
  })

  return { plan, equipment: remoteBundle.equipment }
}

export const useAppStore = create<AppState>((set, get) => ({
  initialized: false,
  initializing: false,
  loading: false,
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  sortMode: 'route',
  plan: null,
  equipment: {},
  templates: {},
  drafts: {},
  selectedEquipmentId: null,
  currentDraft: null,
  notice: null,
  sync: {
    pending: 0,
    failed: 0,
    syncing: false,
  },
  async bootstrap() {
    if (get().initialized || get().initializing) {
      return
    }

    set({ initializing: true, loading: true, online: navigator.onLine })

    const templates = await ensureTemplates()
    const [plans, equipment, drafts, storedSelection, sync] = await Promise.all([
      db.plans.toArray(),
      db.equipment.toArray(),
      db.drafts.toArray(),
      getStoredSelection(),
      summarizeQueue(),
    ])

    const plan = plans.sort((left, right) => right.date.localeCompare(left.date))[0] ?? null
    const draftMap = indexById(drafts)
    const equipmentMap = indexById(equipment)
    const selectedEquipmentId = getDefaultSelection(plan, draftMap, storedSelection)
    const currentDraft = selectedEquipmentId
      ? await loadCurrentDraft(plan, equipmentMap, templates, selectedEquipmentId)
      : null

    set({
      templates,
      equipment: equipmentMap,
      drafts: currentDraft ? { ...draftMap, [currentDraft.id]: currentDraft } : draftMap,
      plan: plan ? { ...plan, source: plan.source ?? 'cache' } : null,
      selectedEquipmentId,
      currentDraft,
      sync,
      initializing: false,
      initialized: true,
      loading: false,
    })

    await get().refreshPlan()
    if (navigator.onLine) {
      void get().syncQueue()
    }
  },
  async refreshPlan() {
    set({ loading: true })

    try {
      const { plan, equipment } = await ensurePlanData()
      const equipmentMap = {
        ...get().equipment,
        ...indexById(equipment),
      }
      const selectedEquipmentId = getDefaultSelection(
        plan,
        get().drafts,
        get().selectedEquipmentId,
      )
      const currentDraft = selectedEquipmentId
        ? await loadCurrentDraft(plan, equipmentMap, get().templates, selectedEquipmentId)
        : null

      set({
        plan,
        equipment: equipmentMap,
        selectedEquipmentId,
        currentDraft,
        loading: false,
        notice: null,
      })
    } catch (error) {
      const hasLocalPlan = Boolean(get().plan)
      if (!hasLocalPlan) {
        const demoBundle = createDemoPlanBundle()
        await db.transaction('rw', db.plans, db.equipment, async () => {
          await db.plans.put(demoBundle.plan)
          await db.equipment.bulkPut(demoBundle.equipment)
        })

        const equipmentMap = indexById(demoBundle.equipment)
        const currentDraft = await loadCurrentDraft(
          demoBundle.plan,
          equipmentMap,
          get().templates,
          demoBundle.plan.items[0]?.equipmentId ?? '',
        )

        set({
          plan: demoBundle.plan,
          equipment: equipmentMap,
          selectedEquipmentId: demoBundle.plan.items[0]?.equipmentId ?? null,
          currentDraft,
          loading: false,
          notice: createNotice('Сервер недоступен. Загружен локальный демонстрационный маршрут.', 'info'),
        })
      } else {
        set({
          loading: false,
          notice: createNotice(`Оставлен локальный кэш. ${toErrorMessage(error)}`, 'info'),
        })
      }
    }
  },
  async selectEquipment(equipmentId) {
    const { plan, equipment, templates, drafts } = get()
    const currentDraft = await loadCurrentDraft(plan, equipment, templates, equipmentId)
    await persistMeta('selected-equipment', equipmentId)

    set({
      selectedEquipmentId: equipmentId,
      currentDraft,
      drafts: currentDraft ? { ...drafts, [currentDraft.id]: currentDraft } : drafts,
      notice: null,
    })
  },
  async updateChecklistValue(itemId, value) {
    const { currentDraft, drafts, equipment, templates } = get()
    if (!currentDraft || currentDraft.completedAt) {
      return
    }

    const template = getTemplateForEquipment(equipment[currentDraft.equipmentId], templates)
    const error = getFieldError(template, itemId, value)
    if (error && template.items.find((item) => item.id === itemId)?.type === 'number') {
      safeVibrate([60, 30, 90])
    }

    const nextDraft: InspectionDraft = {
      ...currentDraft,
      updatedAt: nowIso(),
      lastSavedLocallyAt: nowIso(),
      checklistValues: {
        ...currentDraft.checklistValues,
        [itemId]: value,
      },
      checklistErrors: error
        ? { ...currentDraft.checklistErrors, [itemId]: error }
        : Object.fromEntries(Object.entries(currentDraft.checklistErrors).filter(([key]) => key !== itemId)),
    }

    const nextDrafts = await writeDraft(nextDraft, drafts)
    set({
      drafts: nextDrafts,
      currentDraft: nextDraft,
      notice: createNotice('Черновик сохранён.', 'info'),
    })
  },
  async updateResultStatus(status) {
    const { currentDraft, drafts } = get()
    if (!currentDraft || currentDraft.completedAt) {
      return
    }

    const nextDraft: InspectionDraft = {
      ...currentDraft,
      resultStatus: status,
      updatedAt: nowIso(),
      lastSavedLocallyAt: nowIso(),
    }

    const nextDrafts = await writeDraft(nextDraft, drafts)
    set({
      drafts: nextDrafts,
      currentDraft: nextDraft,
      notice: status === 'defect'
        ? createNotice('Для дефекта потребуется минимум одна фотография.', 'defect')
        : createNotice('Статус обновлён.', 'info'),
    })
  },
  async handleQrScan(code) {
    const { currentDraft, drafts, equipment } = get()
    if (!currentDraft || currentDraft.completedAt) {
      return { matched: false, message: 'Осмотр уже завершён.' }
    }

    const expected = equipment[currentDraft.equipmentId]?.expectedQrCode
    const matched = normalizeQrCode(code) === normalizeQrCode(expected ?? '')
    const nextDraft: InspectionDraft = {
      ...currentDraft,
      qrStatus: matched ? 'matched' : 'mismatch',
      scannedQrCode: code,
      scannedAt: nowIso(),
      updatedAt: nowIso(),
      lastSavedLocallyAt: nowIso(),
    }

    const nextDrafts = await writeDraft(nextDraft, drafts)
    if (!matched) {
      safeVibrate([80, 50, 80])
    }

    set({
      drafts: nextDrafts,
      currentDraft: nextDraft,
      notice: matched
        ? createNotice('QR подтверждён.', 'ok')
        : createNotice(`Ожидался код ${expected}.`, 'error'),
    })

    return {
      matched,
      message: matched ? 'Оборудование подтверждено.' : `Ожидался код ${expected}.`,
    }
  },
  async addPhotos(files) {
    const { currentDraft, drafts } = get()
    if (!currentDraft || currentDraft.completedAt) {
      return
    }

    const list = Array.isArray(files) ? files : Array.from(files)
    const photos: InspectionPhoto[] = list.map((file) => ({
      id: crypto.randomUUID(),
      blob: file,
      capturedAt: nowIso(),
      syncStatus: 'pending',
    }))

    const nextDraft: InspectionDraft = {
      ...currentDraft,
      photos: [...currentDraft.photos, ...photos],
      updatedAt: nowIso(),
      lastSavedLocallyAt: nowIso(),
    }

    const nextDrafts = await writeDraft(nextDraft, drafts)
    set({
      drafts: nextDrafts,
      currentDraft: nextDraft,
      notice: createNotice('Фото сохранены локально.', 'info'),
    })
  },
  async removePhoto(photoId) {
    const { currentDraft, drafts } = get()
    if (!currentDraft || currentDraft.completedAt) {
      return
    }

    const nextDraft: InspectionDraft = {
      ...currentDraft,
      photos: currentDraft.photos.filter((photo) => photo.id !== photoId),
      updatedAt: nowIso(),
      lastSavedLocallyAt: nowIso(),
    }

    const nextDrafts = await writeDraft(nextDraft, drafts)
    set({
      drafts: nextDrafts,
      currentDraft: nextDraft,
      notice: createNotice('Фото удалено из черновика.', 'info'),
    })
  },
  async completeInspection() {
    const { currentDraft, equipment, templates, drafts, plan } = get()
    if (!currentDraft || !plan) {
      return { ok: false, message: 'Нет активного осмотра.' }
    }

    const currentEquipment = equipment[currentDraft.equipmentId]
    const template = getTemplateForEquipment(currentEquipment, templates)
    const validation = validateDraft(currentDraft, template, currentEquipment.expectedQrCode)

    if (!validation.isValid) {
      const nextDraft: InspectionDraft = {
        ...currentDraft,
        updatedAt: nowIso(),
        lastSavedLocallyAt: nowIso(),
        checklistErrors: validation.fieldErrors,
      }

      const nextDrafts = await writeDraft(nextDraft, drafts)
      const message = validation.globalErrors[0] ?? Object.values(validation.fieldErrors)[0] ?? 'Проверьте форму.'

      safeVibrate([100, 60, 100])
      set({
        drafts: nextDrafts,
        currentDraft: nextDraft,
        notice: createNotice(message, 'error'),
      })
      return { ok: false, message }
    }

    const timestamp = nowIso()
    const completedDraft: InspectionDraft = {
      ...currentDraft,
      updatedAt: timestamp,
      lastSavedLocallyAt: timestamp,
      completedAt: timestamp,
      recordedAt: timestamp,
      checklistErrors: {},
      syncStatus: 'saved_locally',
    }

    await db.transaction('rw', db.drafts, db.queue, async () => {
      await db.drafts.put(completedDraft)

      for (const photo of completedDraft.photos) {
        if (photo.remoteUrl) {
          continue
        }

        await db.queue.add({
          draftId: completedDraft.id,
          photoId: photo.id,
          actionType: 'upload_photo',
          status: 'pending',
          attempts: 0,
          createdAt: timestamp,
          updatedAt: timestamp,
          payload: {},
        })
      }

      await db.queue.add({
        draftId: completedDraft.id,
        actionType: 'submit_result',
        status: 'pending',
        attempts: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
        payload: {},
      })
    })

    const nextDrafts = {
      ...drafts,
      [completedDraft.id]: completedDraft,
    }
    const nextEquipmentId = chooseNextEquipmentId(
      plan.items.map((item) => item.equipmentId),
      nextDrafts,
      currentDraft.equipmentId,
    )

    const sync = await summarizeQueue()
    set({
      drafts: nextDrafts,
      currentDraft: completedDraft,
      sync,
      notice: createNotice('Осмотр записан. Данные сохранены локально.', 'ok'),
    })

    if (nextEquipmentId) {
      await get().selectEquipment(nextEquipmentId)
    }

    if (get().online) {
      void get().syncQueue()
    }

    return { ok: true, message: 'Осмотр сохранён.' }
  },
  async syncQueue() {
    if (!navigator.onLine || get().sync.syncing) {
      return
    }

    set((state) => ({
      sync: {
        ...state.sync,
        syncing: true,
      },
      notice: null,
    }))

    const queue = await db.queue.toArray()
    const pendingItems = queue
      .filter((item) => item.status === 'pending' || item.status === 'failed')
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))

    for (const item of pendingItems) {
      if (!item.id) {
        continue
      }

      const startedAt = nowIso()
      await db.queue.update(item.id, {
        status: 'syncing',
        attempts: item.attempts + 1,
        updatedAt: startedAt,
        error: undefined,
      })

      const draft = await db.drafts.get(item.draftId)
      if (!draft) {
        await db.queue.update(item.id, {
          status: 'synced',
          updatedAt: nowIso(),
        })
        continue
      }

      const equipmentItem = get().equipment[draft.equipmentId]
      const template = equipmentItem ? getTemplateForEquipment(equipmentItem, get().templates) : undefined
      if (!equipmentItem || !template) {
        await db.queue.update(item.id, {
          status: 'failed',
          updatedAt: nowIso(),
          error: 'Не найден шаблон или оборудование для синка.',
        })
        continue
      }

      try {
        if (item.actionType === 'upload_photo') {
          const photo = draft.photos.find((entry) => entry.id === item.photoId)
          if (!photo) {
            await db.queue.update(item.id, {
              status: 'synced',
              updatedAt: nowIso(),
            })
            continue
          }

          const result = await uploadPhoto(draft, photo, equipmentItem)
          const nextDraft: InspectionDraft = {
            ...draft,
            photos: draft.photos.map((entry) => entry.id === photo.id
              ? { ...entry, remoteUrl: result.remoteUrl, syncStatus: 'synced', error: undefined }
              : entry),
            updatedAt: nowIso(),
            lastSyncError: undefined,
          }
          await db.drafts.put(nextDraft)
          await db.queue.update(item.id, {
            status: 'synced',
            updatedAt: nowIso(),
          })
          continue
        }

        if (draft.resultStatus === 'defect' && draft.photos.some((photo) => !photo.remoteUrl)) {
          throw new Error('Фотографии ещё не загружены на сервер.')
        }

        const result = await submitInspection(draft, equipmentItem, template)
        const nextDraft: InspectionDraft = {
          ...draft,
          syncStatus: 'synced',
          serverId: result.serverId,
          updatedAt: nowIso(),
          lastSyncError: undefined,
        }
        await db.drafts.put(nextDraft)
        await db.queue.update(item.id, {
          status: 'synced',
          updatedAt: nowIso(),
        })
      } catch (error) {
        const message = toErrorMessage(error)
        const nextDraft: InspectionDraft = {
          ...draft,
          syncStatus: 'error',
          lastSyncError: message,
          updatedAt: nowIso(),
          photos: item.photoId
            ? draft.photos.map((entry) => entry.id === item.photoId
              ? { ...entry, syncStatus: 'failed', error: message }
              : entry)
            : draft.photos,
        }
        await db.drafts.put(nextDraft)
        await db.queue.update(item.id, {
          status: navigator.onLine ? 'failed' : 'pending',
          updatedAt: nowIso(),
          error: message,
        })
      }
    }

    const [drafts, sync] = await Promise.all([
      reconcileDraftSyncStatus(),
      summarizeQueue(false),
    ])
    const activeDraft = get().currentDraft
    const currentDraft = activeDraft ? drafts[activeDraft.id] ?? null : null

    set({
      drafts,
      currentDraft,
      sync,
      notice: sync.failed > 0
        ? createNotice('Часть данных пока не синхронизирована.', 'error')
        : createNotice(`Синхронизация завершена. ${getSourceLabel(get().plan?.source)}`, 'info'),
    })
  },
  async retryFailed() {
    const queue = await db.queue.toArray()
    const failedItems = queue.filter((item) => item.status === 'failed')
    await Promise.all(failedItems.map((item) => db.queue.update(item.id ?? 0, {
      status: 'pending',
      updatedAt: nowIso(),
      error: undefined,
    })))
    await get().syncQueue()
  },
  setOnline(online) {
    set((state) => ({
      online,
      sync: {
        ...state.sync,
        syncing: online ? state.sync.syncing : false,
      },
    }))
  },
  setSortMode(sortMode) {
    set({ sortMode })
  },
  dismissNotice() {
    set({ notice: null })
  },
}))
