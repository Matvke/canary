import { Route } from 'lucide-react'

export function EmptyInspectionState() {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 text-center text-stone-500">
      <Route className="size-8" />
      <p className="max-w-xs text-sm">
        План ещё не загружен. Обновите данные или дождитесь инициализации.
      </p>
    </div>
  )
}
