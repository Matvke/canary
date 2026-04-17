import { nowIso, todayKey } from '@/lib/app-utils'
import type {
  ChecklistItemTemplate,
  ChecklistTemplate,
  EquipmentRecord,
  InspectionDraft,
  InspectionPhoto,
  RemotePlanBundle,
  Priority,
} from '@/types'

function getApiBase(): string {
  const runtimeBase = window.__CANARY_CONFIG__?.API_BASE_URL
  const buildBase = import.meta.env.VITE_API_BASE_URL

  return (runtimeBase || buildBase || '').replace(/\/$/, '')
}

function buildUrl(path: string): string {
  return `${getApiBase()}${path}`
}

async function readErrorMessage(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    const payload = await response.json().catch(() => null) as Record<string, unknown> | null
    const code = typeof payload?.code === 'string' ? payload.code : undefined
    const message = typeof payload?.message === 'string' ? payload.message : undefined
    const detail = typeof payload?.detail === 'string' ? payload.detail : undefined

    return [code, message ?? detail].filter(Boolean).join(': ') || `HTTP ${response.status}`
  }

  const text = await response.text()
  return text || `HTTP ${response.status}`
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildUrl(path), init)

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  return response.json() as Promise<T>
}

async function requestResponse(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(buildUrl(path), init)
  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  return response
}

function normalizePriority(value: unknown): Priority {
  if (value === 'high' || value === 'medium' || value === 'low') {
    return value
  }

  return 'medium'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function normalizeChecklistItem(value: unknown): ChecklistItemTemplate {
  if (!isRecord(value)) {
    throw new Error('Некорректный пункт чеклиста в плане.')
  }

  const id = value.id
  const label = value.label
  const type = value.type

  if (typeof id !== 'string' || typeof label !== 'string') {
    throw new Error('Пункт чеклиста должен содержать id и label.')
  }

  if (type !== 'number' && type !== 'select' && type !== 'boolean' && type !== 'text') {
    throw new Error(`Неподдерживаемый тип пункта чеклиста: ${String(type)}.`)
  }

  const options = Array.isArray(value.options)
    ? value.options.flatMap((option) => {
      if (!isRecord(option) || typeof option.value !== 'string' || typeof option.label !== 'string') {
        return []
      }

      return [{ value: option.value, label: option.label }]
    })
    : undefined

  const range = isRecord(value.range)
    ? {
      min: typeof value.range.min === 'number' ? value.range.min : undefined,
      max: typeof value.range.max === 'number' ? value.range.max : undefined,
      unit: typeof value.range.unit === 'string' ? value.range.unit : undefined,
    }
    : undefined

  return {
    id,
    label,
    type,
    required: value.required === true,
    hint: typeof value.hint === 'string' ? value.hint : undefined,
    placeholder: typeof value.placeholder === 'string' ? value.placeholder : undefined,
    range,
    options,
  }
}

function normalizeChecklistTemplate(value: unknown, fallbackId: string): ChecklistTemplate {
  if (!isRecord(value)) {
    throw new Error('Оборудование в плане должно содержать checklist.')
  }

  const rawItems = value.items
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error('Checklist template должен содержать непустой items.')
  }

  return {
    id: typeof value.id === 'string' ? value.id : fallbackId,
    name: typeof value.name === 'string' ? value.name : 'Чеклист осмотра',
    version: typeof value.version === 'number' ? value.version : 1,
    items: rawItems.map(normalizeChecklistItem),
  }
}

function normalizeTodayPlanBundle(payload: unknown): RemotePlanBundle {
  if (!isRecord(payload)) {
    throw new Error('Ответ /inspection-plans/today должен быть JSON object.')
  }

  const source = payload
  const items = Array.isArray(source.items) ? source.items : null
  if (!items) {
    throw new Error('Ответ /inspection-plans/today должен содержать массив items.')
  }

  const templatesById = new Map<string, ChecklistTemplate>()
  const equipment: EquipmentRecord[] = items.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error('Элемент плана должен быть JSON object.')
    }

    const rawId = entry.equipmentId ?? entry.id
    if (typeof rawId !== 'string' && typeof rawId !== 'number') {
      throw new Error('Элемент плана должен содержать id или equipmentId.')
    }

    const id = typeof rawId === 'number' ? `equipment-${rawId}` : rawId
    const name = typeof entry.name === 'string' ? entry.name : `Оборудование ${rawId}`
    const checklistTemplateId = typeof entry.checklistTemplateId === 'string'
      ? entry.checklistTemplateId
      : `${id}-checklist`
    const checklist = normalizeChecklistTemplate(entry.checklist, checklistTemplateId)
    templatesById.set(checklist.id, checklist)

    return {
      id,
      backendId: typeof rawId === 'number' ? rawId : undefined,
      name,
      location: typeof entry.location === 'string' ? entry.location : `Маршрут ${index + 1}`,
      priority: normalizePriority(entry.priority),
      checklistTemplateId: checklist.id,
      equipmentStatus: typeof entry.status === 'string' ? entry.status : undefined,
      expectedQrCode: typeof entry.expectedQrCode === 'string' ? entry.expectedQrCode : '',
      updatedAt: nowIso(),
    }
  })

  if (equipment.length === 0) {
    throw new Error('План на сегодня пуст.')
  }

  if (equipment.some((item) => !item.expectedQrCode)) {
    throw new Error('Каждое оборудование в плане должно содержать expectedQrCode.')
  }

  return {
    plan: {
      id: typeof source.id === 'string' ? source.id : `plan-${todayKey()}`,
      date: typeof source.date === 'string' ? source.date : todayKey(),
      source: 'remote',
      syncedAt: nowIso(),
      items: equipment.map((item, index) => ({
        equipmentId: item.id,
        order: index + 1,
        priority: item.priority,
      })),
    },
    equipment,
    templates: [...templatesById.values()],
  }
}

export async function fetchTodayPlan(): Promise<RemotePlanBundle> {
  return normalizeTodayPlanBundle(await requestJson<unknown>('/inspection-plans/today'))
}

function modernInspectionPayload(draft: InspectionDraft, equipment: EquipmentRecord) {
  return {
    local_id: draft.id,
    equipment_id: equipment.backendId ?? equipment.id,
    employee_id: draft.employeeId,
    inspector_name: draft.inspectorName,
    status: draft.resultStatus,
    qr_code: draft.scannedQrCode,
    scanned_at: draft.scannedAt,
    timestamp: draft.completedAt ?? draft.updatedAt,
    checklist: draft.checklistValues,
    photo_ids: draft.photos.map((photo) => photo.id),
    photo_urls: draft.photos.map((photo) => photo.remoteUrl).filter(Boolean),
    supervision: {
      quality_review_required: draft.supervision?.reviewRequired ?? false,
      selected_at: draft.supervision?.selectedAt ?? null,
      reason: draft.supervision?.reason ?? null,
    },
  }
}

export async function uploadPhoto(
  draft: InspectionDraft,
  photo: InspectionPhoto,
  equipment: EquipmentRecord,
): Promise<{ remoteUrl: string }> {
  const formData = new FormData()
  formData.append('file', photo.blob, `${draft.id}-${photo.id}.jpg`)
  formData.append('draft_id', draft.id)
  formData.append('photo_id', photo.id)
  formData.append('equipment_id', equipment.backendId?.toString() ?? equipment.id)
  formData.append('captured_at', photo.capturedAt)

  const response = await requestResponse('/upload-photo', {
    method: 'POST',
    body: formData,
  })

  const payload = await response.json() as Record<string, unknown>
  const remoteUrl = typeof payload.url === 'string'
    ? payload.url
    : typeof payload.photo_url === 'string'
      ? payload.photo_url
      : null

  if (!remoteUrl) {
    throw new Error('Ответ /upload-photo должен содержать url.')
  }

  return { remoteUrl }
}

export async function submitInspection(
  draft: InspectionDraft,
  equipment: EquipmentRecord,
): Promise<{ serverId?: string }> {
  const response = await requestResponse('/inspection-results', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(modernInspectionPayload(draft, equipment)),
  })
  const payload = await response.json() as Record<string, unknown>
  const id = payload.id

  return { serverId: typeof id === 'string' || typeof id === 'number' ? String(id) : undefined }
}
