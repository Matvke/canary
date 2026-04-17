import type { InspectionDraft, ResultStatus } from '@/types'

interface ResultStatusCardProps {
  draft: InspectionDraft
  onUpdateResultStatus: (status: ResultStatus | null) => Promise<void>
}

export function ResultStatusCard({ draft, onUpdateResultStatus }: ResultStatusCardProps) {
  return (
    <section className="space-y-3 rounded-[1.75rem] border border-stone-200 bg-stone-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Итоговое состояние</h3>
          <p className="mt-1 text-sm text-stone-600">При дефекте приложение потребует фотографию.</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={Boolean(draft.completedAt)}
          onClick={() => void onUpdateResultStatus('ok')}
          className={`min-h-14 rounded-2xl border px-4 py-3 text-base font-semibold ${
            draft.resultStatus === 'ok'
              ? 'border-emerald-500 bg-emerald-600 text-white'
              : 'border-stone-200 bg-white text-stone-800'
          }`}
        >
          Норма
        </button>
        <button
          type="button"
          disabled={Boolean(draft.completedAt)}
          onClick={() => void onUpdateResultStatus('defect')}
          className={`min-h-14 rounded-2xl border px-4 py-3 text-base font-semibold ${
            draft.resultStatus === 'defect'
              ? 'border-rose-500 bg-rose-600 text-white'
              : 'border-stone-200 bg-white text-stone-800'
          }`}
        >
          Дефект
        </button>
      </div>
    </section>
  )
}
