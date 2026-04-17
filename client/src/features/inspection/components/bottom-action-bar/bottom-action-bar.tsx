import { CheckCircle2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { EquipmentRecord, InspectionDraft } from '@/types'

interface BottomActionBarProps {
  draft: InspectionDraft | null
  equipment?: EquipmentRecord
  initialized: boolean
  onComplete: () => Promise<{ ok: boolean; message: string }>
}

export function BottomActionBar({ draft, equipment, initialized, onComplete }: BottomActionBarProps) {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-white/70 bg-white/88 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex w-full max-w-md items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-stone-800">
            {equipment ? equipment.name : 'Нет выбранного объекта'}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            {draft?.completedAt ? 'Осмотр записан' : 'Завершение не ждёт ответа сервера'}
          </p>
        </div>
        <Button
          type="button"
          size="lg"
          onClick={() => void onComplete()}
          disabled={!initialized || Boolean(draft?.completedAt) || !draft}
          className="h-14 min-w-[12rem] rounded-[1.3rem] bg-stone-950 text-base text-white hover:bg-stone-800"
        >
          <CheckCircle2 className="size-5" />
          Завершить
        </Button>
      </div>
    </footer>
  )
}
