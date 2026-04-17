import './route-card.css'

import {
  formatTime,
  getCompletion,
  getPriorityLabel,
  getStatusLabel,
  getSyncLabel,
  getVisualStatus,
  getVisualTone,
} from '@/lib/app-utils'
import type { ChecklistTemplate, EquipmentRecord, InspectionDraft } from '@/types'

interface RouteCardProps {
  draft?: InspectionDraft
  equipment: EquipmentRecord
  index: number
  onSelect: () => void
  selected: boolean
  template?: ChecklistTemplate
}

export function RouteCard({ draft, equipment, index, onSelect, selected, template }: RouteCardProps) {
  const status = getVisualStatus(draft)
  const completion = template ? getCompletion(template, draft) : { done: 0, total: 0 }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`route-card w-full rounded-[1.75rem] border p-4 text-left shadow-sm transition ${getVisualTone(status)} ${selected ? 'ring-2 ring-stone-900/10' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex size-8 items-center justify-center rounded-2xl bg-white/80 text-sm font-bold text-stone-900">
              {index + 1}
            </span>
            <span className="rounded-full border border-black/10 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-stone-700">
              {getStatusLabel(status)}
            </span>
          </div>
          <h3 className="mt-3 text-lg font-semibold">{equipment.name}</h3>
          <p className="mt-1 text-sm text-stone-600">{equipment.location}</p>
        </div>
        <div className="text-right text-sm text-stone-600">
          <p>{getPriorityLabel(equipment.priority)}</p>
          <p className="mt-2">{completion.done}/{completion.total}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-stone-600">
        <span className="rounded-full bg-white/70 px-3 py-1">
          QR {draft?.qrStatus === 'matched' ? 'сканирован' : 'ожидается'}
        </span>
        {draft?.recordedAt ? (
          <span className="rounded-full bg-white/70 px-3 py-1">Записан {formatTime(draft.recordedAt)}</span>
        ) : null}
        <span className="rounded-full bg-white/70 px-3 py-1">{draft ? getSyncLabel(draft.syncStatus) : 'Без черновика'}</span>
      </div>
    </button>
  )
}
