import { formatDateTime, formatTime } from '@/lib/app-utils'
import type { EquipmentRecord, InspectionDraft } from '@/types'

interface InspectionMetaGridProps {
  draft: InspectionDraft
  equipment: EquipmentRecord
}

export function InspectionMetaGrid({ draft, equipment }: InspectionMetaGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <article className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4">
        <p className="text-xs text-stone-500">QR-код</p>
        <p className="mt-2 text-sm font-semibold">{equipment.expectedQrCode}</p>
        <p className="mt-2 text-xs text-stone-500">
          {draft.scannedAt ? `Отсканирован в ${formatTime(draft.scannedAt)}` : 'Ещё не подтверждён'}
        </p>
      </article>
      <article className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4">
        <p className="text-xs text-stone-500">Черновик</p>
        <p className="mt-2 text-sm font-semibold">Сохранён {formatTime(draft.lastSavedLocallyAt)}</p>
        <p className="mt-2 text-xs text-stone-500">
          {draft.recordedAt ? `Осмотр записан ${formatDateTime(draft.recordedAt)}` : 'Осмотр ещё не завершён'}
        </p>
      </article>
    </div>
  )
}
