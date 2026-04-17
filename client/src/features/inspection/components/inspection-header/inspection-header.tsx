import { ListOrdered } from 'lucide-react'

import type { EquipmentRecord } from '@/types'

interface InspectionHeaderProps {
  equipment: EquipmentRecord
  syncLabel: string
  syncTone: string
}

export function InspectionHeader({ equipment, syncLabel, syncTone }: InspectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-600">
          <ListOrdered className="size-3.5" />
          Текущий объект
        </div>
        <h2 className="mt-3 text-2xl font-semibold">{equipment.name}</h2>
        <p className="mt-1 text-sm text-stone-600">{equipment.location}</p>
      </div>
      <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${syncTone}`}>
        {syncLabel}
      </div>
    </div>
  )
}
