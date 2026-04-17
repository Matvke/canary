import {CheckCircle2, CircleAlert, X} from 'lucide-react'

import type { Notice } from '@/store/use-app-store'

interface NoticeBannerProps {
  notice: Notice | null
  onDismiss: () => void
}

export function NoticeBanner({ notice, onDismiss }: NoticeBannerProps) {
  if (!notice) {
    return null
  }

  const isError = notice.tone === 'error' || notice.tone === 'defect'
  const toneClass = isError
    ? 'border-rose-200 bg-rose-50 text-rose-900'
    : notice.tone === 'ok'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
      : 'border-stone-200 bg-white/90 text-stone-800'

  return (
    <button
      type="button"
      className={`mt-4 flex w-full items-center justify-between rounded-[1.5rem] border px-4 py-3 text-left shadow-sm ${toneClass}`}
    >
      <span className={"flex gap-3"}>
        {isError ? <CircleAlert className="mt-0.5 size-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" />}
        <span className="text-sm font-medium">{notice.message}</span>
      </span>
      <button className="hover:cursor-pointer" onClick={onDismiss}><X size={16} /></button>
    </button>
  )
}
