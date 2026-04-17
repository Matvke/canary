import { ShieldCheck } from 'lucide-react'

import type { InspectionDraft } from '@/types'

interface SupervisionNoticeProps {
  draft: InspectionDraft
}

export function SupervisionNotice({ draft }: SupervisionNoticeProps) {
  if (!draft.supervision?.reviewRequired) {
    return null
  }

  return (
    <aside className="rounded-[1.5rem] border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-2xl bg-amber-200 text-amber-950">
          <ShieldCheck className="size-5" />
        </div>
        <div>
          <p className="text-sm font-semibold">Контроль качества</p>
          <p className="mt-1 text-sm leading-5 text-amber-900">
            Результаты этого осмотра будут просмотрены руководством для проверки качества заполнения.
          </p>
        </div>
      </div>
    </aside>
  )
}
