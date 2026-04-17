import Dexie, { type Table } from 'dexie'

import type {
  ChecklistTemplate,
  DailyPlan,
  EquipmentRecord,
  InspectionDraft,
  MetaRecord,
  QueueItem,
} from '@/types'

class CanaryDb extends Dexie {
  plans!: Table<DailyPlan, string>
  equipment!: Table<EquipmentRecord, string>
  templates!: Table<ChecklistTemplate, string>
  drafts!: Table<InspectionDraft, string>
  queue!: Table<QueueItem, number>
  meta!: Table<MetaRecord, string>

  constructor() {
    super('canary-inspections')

    this.version(1).stores({
      plans: 'id, date, source',
      equipment: 'id, backendId, priority, checklistTemplateId',
      templates: 'id',
      drafts: 'id, planId, equipmentId, updatedAt, completedAt, syncStatus',
      queue: '++id, draftId, actionType, status, createdAt',
      meta: 'key',
    })
  }
}

export const db = new CanaryDb()
