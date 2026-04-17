import { Route } from 'lucide-react'
import { startTransition } from 'react'

import { RouteCard } from '@/features/plan/components/route-card/route-card'
import type { ChecklistTemplate, EquipmentRecord, InspectionDraft } from '@/types'

interface RoutePlanSectionProps {
  drafts: Record<string, InspectionDraft>
  equipment: Record<string, EquipmentRecord>
  equipmentIds: string[]
  onSelectEquipment: (equipmentId: string) => Promise<void>
  selectedEquipmentId: string | null
  templates: Record<string, ChecklistTemplate>
}

export function RoutePlanSection({
  drafts,
  equipment,
  equipmentIds,
  onSelectEquipment,
  selectedEquipmentId,
  templates,
}: RoutePlanSectionProps) {
  return (
    <section className="mt-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">План на сегодня</h2>
        <div className="inline-flex items-center gap-2 text-sm text-stone-600">
          <Route className="size-4" />
          Текущий маршрут
        </div>
      </div>

      <div className="space-y-3">
        {equipmentIds.map((equipmentId, index) => {
          const item = equipment[equipmentId]
          const draft = Object.values(drafts).find((entry) => entry.equipmentId === equipmentId)
          const template = item ? templates[item.checklistTemplateId] : undefined

          if (!item) {
            return null
          }

          return (
            <RouteCard
              key={equipmentId}
              draft={draft}
              equipment={item}
              index={index}
              selected={selectedEquipmentId === equipmentId}
              template={template}
              onSelect={() => {
                startTransition(() => {
                  void onSelectEquipment(equipmentId)
                })
              }}
            />
          )
        })}
      </div>
    </section>
  )
}
