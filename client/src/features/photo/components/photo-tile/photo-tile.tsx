import { CircleAlert, CloudUpload, Trash2 } from 'lucide-react'
import { useEffect, useMemo } from 'react'

import { Button } from '@/components/ui/button'
import { getSyncTone } from '@/lib/app-utils'
import type { InspectionPhoto } from '@/types'

interface PhotoTileProps {
  disabled?: boolean
  onRemove: (photoId: string) => void
  photo: InspectionPhoto
}

export function PhotoTile({ disabled, onRemove, photo }: PhotoTileProps) {
  const previewUrl = useMemo(() => URL.createObjectURL(photo.blob), [photo.blob])

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const syncLabel = photo.syncStatus === 'failed'
    ? 'Ошибка фото'
    : photo.syncStatus === 'synced'
      ? 'Фото загружено'
      : 'Ждёт выгрузки'

  const syncTone = photo.syncStatus === 'failed'
    ? 'bg-rose-100 text-rose-900 border-rose-300'
    : photo.syncStatus === 'synced'
      ? getSyncTone('synced')
      : getSyncTone('saved_locally')

  return (
    <article className="space-y-3 rounded-3xl border border-stone-200 bg-white p-3 shadow-sm">
      <div className="overflow-hidden rounded-2xl bg-stone-200">
        {previewUrl ? (
          <img src={previewUrl} alt="Фото осмотра" className="aspect-square w-full object-cover" />
        ) : (
          <div className="flex aspect-square items-center justify-center text-sm text-stone-500">
            Нет превью
          </div>
        )}
      </div>
      <div className="flex items-start justify-between gap-3">
        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${syncTone}`}>
          {photo.syncStatus === 'failed' ? <CircleAlert className="size-3.5" /> : <CloudUpload className="size-3.5" />}
          {syncLabel}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={() => onRemove(photo.id)}
          className="size-10 rounded-2xl text-stone-600"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
      {photo.error ? (
        <p className="text-xs text-rose-700">{photo.error}</p>
      ) : null}
    </article>
  )
}
