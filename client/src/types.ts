export type ChecklistItemType = 'number' | 'select' | 'boolean' | 'text'
export type Priority = 'high' | 'medium' | 'low'
export type ResultStatus = 'ok' | 'defect'
export type VisualStatus = 'pending' | 'in_progress' | 'ok' | 'defect'
export type SyncIndicator = 'saved_locally' | 'syncing' | 'synced' | 'error'
export type SortMode = 'route' | 'status' | 'priority'
export type StoredChecklistValue = string | boolean | null

export interface ChecklistOption {
  label: string
  value: string
}

export interface ChecklistRange {
  min?: number
  max?: number
  unit?: string
}

export interface ChecklistItemTemplate {
  id: string
  label: string
  type: ChecklistItemType
  required: boolean
  hint?: string
  placeholder?: string
  range?: ChecklistRange
  options?: ChecklistOption[]
}

export interface ChecklistTemplate {
  id: string
  name: string
  version: number
  items: ChecklistItemTemplate[]
}

export interface EquipmentRecord {
  id: string
  backendId?: number
  name: string
  location: string
  expectedQrCode: string
  priority: Priority
  checklistTemplateId: string
  equipmentStatus?: string
  updatedAt: string
}

export interface PlanItem {
  equipmentId: string
  order: number
  priority: Priority
}

export interface DailyPlan {
  id: string
  date: string
  items: PlanItem[]
  source: 'remote' | 'cache' | 'demo'
  syncedAt?: string
}

export interface InspectionPhoto {
  id: string
  blob: Blob
  capturedAt: string
  remoteUrl?: string
  syncStatus: 'pending' | 'synced' | 'failed'
  error?: string
}

export interface InspectionDraft {
  id: string
  planId: string
  equipmentId: string
  employeeId: number
  inspectorName: string
  startedAt: string
  updatedAt: string
  lastSavedLocallyAt: string
  completedAt?: string
  recordedAt?: string
  resultStatus: ResultStatus | null
  qrStatus: 'pending' | 'matched' | 'mismatch'
  scannedQrCode?: string
  scannedAt?: string
  checklistValues: Record<string, StoredChecklistValue>
  checklistErrors: Record<string, string>
  photos: InspectionPhoto[]
  syncStatus: SyncIndicator
  serverId?: string
  lastSyncError?: string
}

export interface QueueItem {
  id?: number
  draftId: string
  photoId?: string
  actionType: 'upload_photo' | 'submit_result'
  status: 'pending' | 'syncing' | 'synced' | 'failed'
  attempts: number
  createdAt: string
  updatedAt: string
  payload: Record<string, string | number | boolean | null>
  error?: string
}

export interface MetaRecord<T = unknown> {
  key: string
  value: T
}

export interface ValidationResult {
  isValid: boolean
  fieldErrors: Record<string, string>
  globalErrors: string[]
}

export interface RemotePlanBundle {
  plan: DailyPlan
  equipment: EquipmentRecord[]
}
