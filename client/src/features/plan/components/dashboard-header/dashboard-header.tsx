import './dashboard-header.css'

import { CloudOff, CloudUpload, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { SortButton } from '@/features/plan/components/sort-button/sort-button'
import { getSourceLabel } from '@/lib/app-utils'
import type { SyncSummary } from '@/store/use-app-store'
import type { DailyPlan, SortMode } from '@/types'

interface DashboardHeaderProps {
  completedCount: number
  loading: boolean
  online: boolean
  onRefreshPlan: () => Promise<void>
  onRetryFailed: () => Promise<void>
  onSortModeChange: (mode: SortMode) => void
  plan: DailyPlan | null
  sortMode: SortMode
  sync: SyncSummary
}

export function DashboardHeader({
  completedCount,
  loading,
  online,
  onRefreshPlan,
  onRetryFailed,
  onSortModeChange,
  plan,
  sortMode,
  sync,
}: DashboardHeaderProps) {
  return (
    <header className="dashboard-header rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-[0_25px_80px_rgba(92,64,28,0.16)] backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-stone-500">Canary PWA</p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight">Маршрут обхода</h1>
          <p className="mt-2 text-sm text-stone-600">
            {plan ? `${plan.items.length} ед. оборудования • ${getSourceLabel(plan.source)}` : 'Подготовка плана'}
          </p>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${online ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-amber-300 bg-amber-50 text-amber-900'}`}>
          {online ? <CloudUpload className="size-3.5" /> : <CloudOff className="size-3.5" />}
          {online ? 'Онлайн' : 'Офлайн'}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <article className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-3">
          <p className="text-xs text-stone-500">Выполнено</p>
          <p className="mt-2 text-2xl font-semibold">{completedCount}</p>
        </article>
        <article className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-3">
          <p className="text-xs text-stone-500">В очереди</p>
          <p className="mt-2 text-2xl font-semibold">{sync.pending}</p>
        </article>
        <article className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-3">
          <p className="text-xs text-stone-500">Ошибки</p>
          <p className="mt-2 text-2xl font-semibold">{sync.failed}</p>
        </article>
      </div>

      <h2 className="my-4 text-sm font-semibold">Сортировать по</h2>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
          <SortButton active={sortMode === 'route'} onClick={() => onSortModeChange('route')}>
            Маршруту
          </SortButton>
          <SortButton active={sortMode === 'status'} onClick={() => onSortModeChange('status')}>
            Статусу
          </SortButton>
          <SortButton active={sortMode === 'priority'} onClick={() => onSortModeChange('priority')}>
            Приоритету
          </SortButton>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => void onRefreshPlan()}
            className="h-12 flex-1 rounded-2xl"
          >
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            Обновить план
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={sync.failed === 0}
            onClick={() => void onRetryFailed()}
            className="h-12 rounded-2xl px-4"
          >
            <CloudUpload className="size-4" />
            Повторить
          </Button>
        </div>
      </div>
    </header>
  )
}
