import { Camera } from 'lucide-react'
import { useRef } from 'react'

import { Button } from '@/components/ui/button'
import { PhotoTile } from '@/features/photo/components/photo-tile/photo-tile'
import type { InspectionDraft } from '@/types'

interface PhotoSectionProps {
  disabled: boolean
  draft: InspectionDraft
  onAddPhotos: (files: FileList | File[]) => Promise<void>
  onRemovePhoto: (photoId: string) => Promise<void>
}

export function PhotoSection({ disabled, draft, onAddPhotos, onRemovePhoto }: PhotoSectionProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  async function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    if (!event.target.files || event.target.files.length === 0) {
      return
    }

    await onAddPhotos(event.target.files)
    event.target.value = ''
  }

  return (
    <section className={`space-y-3 rounded-[1.75rem] border border-stone-200 bg-stone-50 p-4 ${disabled ? 'pointer-events-none opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Фотографии</h3>
          <p className="mt-1 text-sm text-stone-600">
            Для дефекта нужен хотя бы один снимок. Фото сохраняются локально сразу.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || Boolean(draft.completedAt)}
          className="h-12 rounded-2xl px-4"
        >
          <Camera className="size-4" />
          Фото
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={(event) => void handlePhotoChange(event)}
        className="hidden"
      />

      {draft.resultStatus === 'defect' && draft.photos.length === 0 ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          При выбранном статусе «Дефект» добавьте минимум одно фото.
        </p>
      ) : null}

      {draft.photos.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {draft.photos.map((photo) => (
            <PhotoTile
              key={photo.id}
              photo={photo}
              disabled={Boolean(draft.completedAt)}
              onRemove={(photoId) => {
                void onRemovePhoto(photoId)
              }}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[1.5rem] border border-dashed border-stone-300 bg-white px-4 py-6 text-center text-sm text-stone-500">
          Фотографий пока нет.
        </div>
      )}
    </section>
  )
}
