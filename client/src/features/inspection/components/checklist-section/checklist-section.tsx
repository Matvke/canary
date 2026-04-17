import { ChecklistField } from '@/features/checklist/components/checklist-field/checklist-field'
import type { ChecklistTemplate, InspectionDraft, StoredChecklistValue } from '@/types'

interface ChecklistSectionProps {
  completion: { done: number; total: number }
  disabled: boolean
  draft: InspectionDraft
  onUpdateChecklistValue: (itemId: string, value: StoredChecklistValue) => Promise<void>
  template: ChecklistTemplate
}

export function ChecklistSection({
  completion,
  disabled,
  draft,
  onUpdateChecklistValue,
  template,
}: ChecklistSectionProps) {
  return (
    <section className={`space-y-3 ${disabled ? 'pointer-events-none opacity-60' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Чеклист осмотра</h3>
          <p className="mt-1 text-sm text-stone-600">
            Заполнено {completion.done} из {completion.total}
          </p>
        </div>
        <div className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold text-stone-600">
          {template.name}
        </div>
      </div>

      {template.items.map((item) => (
        <ChecklistField
          key={item.id}
          item={item}
          value={draft.checklistValues[item.id]}
          error={draft.checklistErrors[item.id]}
          disabled={disabled || Boolean(draft.completedAt)}
          onChange={(value) => {
            void onUpdateChecklistValue(item.id, value)
          }}
        />
      ))}
    </section>
  )
}
