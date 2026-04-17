import type {
  ChecklistItemTemplate,
  ChecklistTemplate,
  EquipmentRecord,
  InspectionDraft,
  ResultStatus,
  SortMode,
  StoredChecklistValue,
  SyncIndicator,
  VisualStatus,
} from '@/types'
import { DEFAULT_EMPLOYEE_ID, DEFAULT_INSPECTOR_NAME } from '@/data/demo'

const SUPERVISION_REVIEW_PROBABILITY = 0.25

export function nowIso(): string {
  return new Date().toISOString()
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

export function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

export function makeDraftId(planId: string, equipmentId: string): string {
  return `${planId}:${equipmentId}`
}

export function safeVibrate(pattern: number | number[]): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}

export function normalizeQrCode(value: string): string {
  return value.trim().toUpperCase()
}

export function formatTime(value?: string): string {
  if (!value) {
    return 'нет'
  }

  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function formatDateTime(value?: string): string {
  if (!value) {
    return 'нет'
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return 'Не удалось выполнить действие.'
}

export function getEmptyChecklistValues(template: ChecklistTemplate): Record<string, StoredChecklistValue> {
  return template.items.reduce<Record<string, StoredChecklistValue>>((accumulator, item) => {
    accumulator[item.id] = null
    return accumulator
  }, {})
}

function createSupervisionSignal(timestamp: string): InspectionDraft['supervision'] {
  return {
    reviewRequired: Math.random() < SUPERVISION_REVIEW_PROBABILITY,
    selectedAt: timestamp,
    reason: 'quality_control_sample',
  }
}

export function createDraft(planId: string, equipment: EquipmentRecord, template: ChecklistTemplate): InspectionDraft {
  const timestamp = nowIso()

  return {
    id: makeDraftId(planId, equipment.id),
    planId,
    equipmentId: equipment.id,
    employeeId: DEFAULT_EMPLOYEE_ID,
    inspectorName: DEFAULT_INSPECTOR_NAME,
    startedAt: timestamp,
    updatedAt: timestamp,
    lastSavedLocallyAt: timestamp,
    resultStatus: null,
    qrStatus: 'pending',
    checklistValues: getEmptyChecklistValues(template),
    checklistErrors: {},
    photos: [],
    supervision: createSupervisionSignal(timestamp),
    syncStatus: 'saved_locally',
  }
}

export function parseNumberValue(value: StoredChecklistValue): number | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.replace(',', '.').trim()
  if (!normalized) {
    return null
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export function getItemById(template: ChecklistTemplate, itemId: string): ChecklistItemTemplate | undefined {
  return template.items.find((item) => item.id === itemId)
}

export function getVisualStatus(draft?: InspectionDraft): VisualStatus {
  if (!draft) {
    return 'pending'
  }

  if (draft.completedAt) {
    return draft.resultStatus === 'defect' ? 'defect' : 'ok'
  }

  return 'in_progress'
}

export function getStatusLabel(status: VisualStatus): string {
  switch (status) {
    case 'ok':
      return 'Норма'
    case 'defect':
      return 'Дефект'
    case 'in_progress':
      return 'В работе'
    case 'pending':
      return 'Не начато'
  }
}

export function getSyncLabel(status: SyncIndicator): string {
  switch (status) {
    case 'saved_locally':
      return 'Сохранено локально'
    case 'syncing':
      return 'Синхронизация'
    case 'synced':
      return 'Синхронизировано'
    case 'error':
      return 'Ошибка синка'
  }
}

export function getSyncTone(status: SyncIndicator): string {
  switch (status) {
    case 'saved_locally':
      return 'bg-amber-100 text-amber-900 border-amber-300'
    case 'syncing':
      return 'bg-sky-100 text-sky-900 border-sky-300'
    case 'synced':
      return 'bg-emerald-100 text-emerald-900 border-emerald-300'
    case 'error':
      return 'bg-rose-100 text-rose-900 border-rose-300'
  }
}

export function getVisualTone(status: VisualStatus): string {
  switch (status) {
    case 'ok':
      return 'border-emerald-400 bg-emerald-50'
    case 'defect':
      return 'border-rose-400 bg-rose-50'
    case 'in_progress':
      return 'border-amber-400 bg-amber-50'
    case 'pending':
      return 'border-stone-300 bg-white/80'
  }
}

export function getPriorityLabel(priority: string): string {
  switch (priority) {
    case 'high':
      return 'Высокий'
    case 'medium':
      return 'Средний'
    case 'low':
      return 'Низкий'
    default:
      return priority
  }
}

export function getPriorityRank(priority: string): number {
  switch (priority) {
    case 'high':
      return 0
    case 'medium':
      return 1
    case 'low':
      return 2
    default:
      return 3
  }
}

export function getSourceLabel(source?: string): string {
  switch (source) {
    case 'remote':
      return 'План с сервера'
    case 'demo':
      return 'Демо-план'
    case 'cache':
      return 'План из кэша'
    default:
      return 'Локальный план'
  }
}

export function getCompletion(template: ChecklistTemplate, draft?: InspectionDraft): { done: number; total: number } {
  if (!draft) {
    return { done: 0, total: template.items.length }
  }

  const done = template.items.filter((item) => isValuePresent(draft.checklistValues[item.id], item.type)).length
  return { done, total: template.items.length }
}

export function isValuePresent(value: StoredChecklistValue, type: ChecklistItemTemplate['type']): boolean {
  if (type === 'boolean') {
    return typeof value === 'boolean'
  }

  return typeof value === 'string' && value.trim().length > 0
}

export function chooseNextEquipmentId(
  equipmentIds: string[],
  drafts: Record<string, InspectionDraft>,
  currentEquipmentId: string,
): string | null {
  const currentIndex = equipmentIds.indexOf(currentEquipmentId)
  const ordered = currentIndex >= 0
    ? [...equipmentIds.slice(currentIndex + 1), ...equipmentIds.slice(0, currentIndex)]
    : equipmentIds

  return ordered.find((equipmentId) => getVisualStatus(drafts[Object.keys(drafts).find((key) => drafts[key]?.equipmentId === equipmentId) ?? '']) !== 'ok'
    && getVisualStatus(drafts[Object.keys(drafts).find((key) => drafts[key]?.equipmentId === equipmentId) ?? '']) !== 'defect') ?? null
}

export function sortEquipmentIds(
  equipmentIds: string[],
  mode: SortMode,
  equipmentMap: Record<string, EquipmentRecord>,
  drafts: Record<string, InspectionDraft>,
): string[] {
  const statusRank: Record<VisualStatus, number> = {
    defect: 0,
    in_progress: 1,
    pending: 2,
    ok: 3,
  }

  return [...equipmentIds].sort((leftId, rightId) => {
    const leftEquipment = equipmentMap[leftId]
    const rightEquipment = equipmentMap[rightId]

    if (!leftEquipment || !rightEquipment) {
      return 0
    }

    if (mode === 'priority') {
      return getPriorityRank(leftEquipment.priority) - getPriorityRank(rightEquipment.priority)
    }

    if (mode === 'status') {
      const leftDraft = Object.values(drafts).find((draft) => draft.equipmentId === leftId)
      const rightDraft = Object.values(drafts).find((draft) => draft.equipmentId === rightId)
      return statusRank[getVisualStatus(leftDraft)] - statusRank[getVisualStatus(rightDraft)]
    }

    return 0
  })
}

export function createNotice(message: string, tone: ResultStatus | 'info' | 'error'): {
  message: string
  tone: 'ok' | 'defect' | 'info' | 'error'
} {
  return { message, tone }
}
