import { createDemoPlanBundle, resolveTemplateId } from '@/data/demo'
import { createId, nowIso, todayKey, toErrorMessage } from '@/lib/app-utils'
import type {
  ChecklistTemplate,
  EquipmentRecord,
  InspectionDraft,
  InspectionPhoto,
  RemotePlanBundle,
} from '@/types'

function getApiBase(): string {
  const runtimeBase = window.__CANARY_CONFIG__?.API_BASE_URL
  const buildBase = import.meta.env.VITE_API_BASE_URL

  return (runtimeBase || buildBase || '').replace(/\/$/, '')
}

interface LegacyEquipment {
  id: number
  name: string
  description?: string | null
  status?: string
}

interface LegacyPlan {
  id: number
  timestamp?: string
  equipment_ids: number[]
}

const API_V1_PREFIX = '/api/v1'

function buildUrl(path: string): string {
  return `${getApiBase()}${path}`
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildUrl(path), init)

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `HTTP ${response.status}`)
  }

  return response.json() as Promise<T>
}

async function requestResponse(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(buildUrl(path), init)
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `HTTP ${response.status}`)
  }

  return response
}

function normalizePriority(value: unknown): EquipmentRecord['priority'] {
  if (value === 'high' || value === 'medium' || value === 'low') {
    return value
  }

  return 'medium'
}

function normalizeModernBundle(payload: unknown): RemotePlanBundle | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const source = payload as Record<string, unknown>
  const items = Array.isArray(source.items) ? source.items : null
  if (!items) {
    return null
  }

  const equipment: EquipmentRecord[] = items.flatMap((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      return []
    }

    const item = entry as Record<string, unknown>
    const rawId = item.equipmentId ?? item.id
    if (typeof rawId !== 'string' && typeof rawId !== 'number') {
      return []
    }

    const id = typeof rawId === 'number' ? `equipment-${rawId}` : rawId
    const name = typeof item.name === 'string' ? item.name : `Оборудование ${rawId}`

    return [{
      id,
      backendId: typeof rawId === 'number' ? rawId : undefined,
      name,
      location: typeof item.location === 'string' ? item.location : `Маршрут ${index + 1}`,
      priority: normalizePriority(item.priority),
      checklistTemplateId: typeof item.checklistTemplateId === 'string'
        ? item.checklistTemplateId
        : resolveTemplateId(name),
      equipmentStatus: typeof item.status === 'string' ? item.status : undefined,
      expectedQrCode: typeof item.expectedQrCode === 'string'
        ? item.expectedQrCode
        : `CANARY-EQ-${String(rawId).padStart(3, '0')}`,
      updatedAt: nowIso(),
    }]
  })

  if (equipment.length === 0) {
    return null
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
  }
}

async function fetchLegacyEquipment(equipmentId: number): Promise<LegacyEquipment> {
  return requestJson<LegacyEquipment>(`/api/v1/equipment/${equipmentId}`)
}

async function fetchLegacyPlanBundle(): Promise<RemotePlanBundle> {
  const plans = await requestJson<LegacyPlan[]>('/api/v1/inspection-plans/')

  if (plans.length === 0) {
    throw new Error('Планов осмотра на сервере нет.')
  }

  const today = todayKey()
  const selectedPlan = [...plans]
    .sort((left, right) => right.id - left.id)
    .find((plan) => plan.timestamp?.slice(0, 10) === today) ?? plans[plans.length - 1]

  const equipment = await Promise.all(selectedPlan.equipment_ids.map(async (equipmentId, index) => {
    const remoteEquipment = await fetchLegacyEquipment(equipmentId)
    return {
      id: `equipment-${remoteEquipment.id}`,
      backendId: remoteEquipment.id,
      name: remoteEquipment.name,
      location: remoteEquipment.description?.trim() || `Маршрут ${index + 1}`,
      priority: index === 0 ? 'high' : index < 3 ? 'medium' : 'low',
      checklistTemplateId: resolveTemplateId(remoteEquipment.name),
      equipmentStatus: remoteEquipment.status,
      expectedQrCode: `CANARY-EQ-${remoteEquipment.id.toString().padStart(3, '0')}`,
      updatedAt: nowIso(),
    } satisfies EquipmentRecord
  }))

  return {
    plan: {
      id: `plan-${selectedPlan.id}`,
      date: selectedPlan.timestamp?.slice(0, 10) || today,
      source: 'remote',
      syncedAt: nowIso(),
      items: equipment.map((item, index) => ({
        equipmentId: item.id,
        order: index + 1,
        priority: item.priority,
      })),
    },
    equipment,
  }
}

export async function fetchTodayPlan(): Promise<RemotePlanBundle> {
  try {
    const modernResponse = await requestJson<unknown>(`${API_V1_PREFIX}/inspection-plans/today/`)
    const modernBundle = normalizeModernBundle(modernResponse)
    if (modernBundle) {
      return modernBundle
    }
  } catch {
    // fall through to legacy endpoint
  }

  try {
    return await fetchLegacyPlanBundle()
  } catch (error) {
    if (navigator.onLine) {
      throw new Error(toErrorMessage(error))
    }

    return createDemoPlanBundle()
  }
}

function calculateScore(draft: InspectionDraft): number {
  if (draft.resultStatus === 'defect') {
    return 35
  }

  return 100
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

function legacyInspectionPayload(
  draft: InspectionDraft,
  equipment: EquipmentRecord,
  template: ChecklistTemplate,
) {
  const values = draft.checklistValues
  const commentField = template.items.find((item) => item.type === 'text')

  return {
    equipment_id: equipment.backendId ?? (Number.parseInt(equipment.id.replace(/\D/g, ''), 10) || 0),
    employee_id: draft.employeeId,
    temperature: Number(values.temperature ?? 0),
    pressure: Number(values.pressure ?? 0),
    vibration: Number(values.vibration ?? 0),
    score: calculateScore(draft),
    timestamp: draft.completedAt ?? draft.updatedAt,
    photo_url: draft.photos[0]?.remoteUrl ?? null,
    observations: commentField ? values[commentField.id] : null,
    supervisor_follow_up: draft.supervision?.reviewRequired ?? false,
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
  formData.append('equipment_id', equipment.backendId?.toString() ?? equipment.id)
  formData.append('captured_at', photo.capturedAt)

  const response = await requestResponse(`${API_V1_PREFIX}/upload-photo`, {
    method: 'POST',
    body: formData,
  })

  const payload = await response.json() as Record<string, unknown>
  const remoteUrl = typeof payload.url === 'string'
    ? payload.url
    : typeof payload.photo_url === 'string'
      ? payload.photo_url
      : `/uploads/${createId('photo')}`

  return { remoteUrl }
}

export async function submitInspection(
  draft: InspectionDraft,
  equipment: EquipmentRecord,
  template: ChecklistTemplate,
): Promise<{ serverId?: string }> {
  try {
    const response = await requestResponse(`${API_V1_PREFIX}/inspection-results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(modernInspectionPayload(draft, equipment)),
    })
    const payload = await response.json() as Record<string, unknown>
    return { serverId: typeof payload.id === 'string' ? payload.id : undefined }
  } catch {
    const response = await requestResponse('/api/v1/inspections/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(legacyInspectionPayload(draft, equipment, template)),
    })
    const payload = await response.json() as Record<string, unknown>
    return { serverId: typeof payload.id === 'number' ? String(payload.id) : undefined }
  }
}
