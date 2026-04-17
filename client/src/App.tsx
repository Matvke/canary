import {
  Camera,
  CheckCircle2,
  CircleAlert,
  CloudOff,
  CloudUpload,
  ListOrdered,
  Mic,
  QrCode,
  RefreshCw,
  Route,
} from 'lucide-react'
import { startTransition, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'

import './App.css'
import { ChecklistField } from '@/components/checklist-field'
import { PhotoTile } from '@/components/photo-tile'
import { QrScannerPanel } from '@/components/qr-scanner-panel'
import { Button } from '@/components/ui/button'
import {
  formatDateTime,
  formatTime,
  getCompletion,
  getPriorityLabel,
  getSourceLabel,
  getStatusLabel,
  getSyncLabel,
  getSyncTone,
  getVisualStatus,
  getVisualTone,
  sortEquipmentIds,
} from '@/lib/app-utils'
import { useAppStore } from '@/store/use-app-store'
import type { SortMode } from '@/types'

function SortButton({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'min-h-11 rounded-2xl border px-4 py-2 text-sm font-semibold transition',
        active
          ? 'border-stone-900 bg-stone-900 text-white'
          : 'border-stone-200 bg-white text-stone-700',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [scannerOpen, setScannerOpen] = useState(false)

  const {
    bootstrap,
    completeInspection,
    currentDraft,
    dismissNotice,
    drafts,
    equipment,
    initialized,
    loading,
    notice,
    online,
    plan,
    refreshPlan,
    retryFailed,
    selectEquipment,
    selectedEquipmentId,
    setOnline,
    setSortMode,
    sortMode,
    sync,
    syncQueue,
    templates,
    updateChecklistValue,
    updateResultStatus,
    handleQrScan,
    addPhotos,
    removePhoto,
  } = useAppStore()

  const scheduleSync = useEffectEvent(() => {
    if (navigator.onLine) {
      void syncQueue()
    }
  })

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  useEffect(() => {
    function handleOnline(): void {
      setOnline(true)
      scheduleSync()
    }

    function handleOffline(): void {
      setOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setOnline])

  useEffect(() => {
    if (!online) {
      return undefined
    }

    const timer = window.setInterval(() => {
      scheduleSync()
    }, 15000)

    return () => {
      window.clearInterval(timer)
    }
  }, [online])

  const currentEquipment = selectedEquipmentId ? equipment[selectedEquipmentId] : undefined
  const currentTemplate = currentEquipment ? templates[currentEquipment.checklistTemplateId] : undefined

  const orderedEquipmentIds = useMemo(() => {
    if (!plan) {
      return []
    }

    const routeIds = plan.items
      .sort((left, right) => left.order - right.order)
      .map((item) => item.equipmentId)

    return sortEquipmentIds(routeIds, sortMode, equipment, drafts)
  }, [drafts, equipment, plan, sortMode])

  const completedCount = useMemo(() => {
    return orderedEquipmentIds.filter((equipmentId) => {
      const draft = Object.values(drafts).find((item) => item.equipmentId === equipmentId)
      const status = getVisualStatus(draft)
      return status === 'ok' || status === 'defect'
    }).length
  }, [drafts, orderedEquipmentIds])

  const currentCompletion = currentTemplate ? getCompletion(currentTemplate, currentDraft ?? undefined) : { done: 0, total: 0 }
  const draftBlocked = currentDraft?.qrStatus !== 'matched'
  const syncedLabel = currentDraft ? getSyncLabel(currentDraft.syncStatus) : 'Нет данных'
  const syncTone = currentDraft ? getSyncTone(currentDraft.syncStatus) : 'bg-stone-100 text-stone-700 border-stone-200'

  async function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    if (!event.target.files || event.target.files.length === 0) {
      return
    }

    await addPhotos(event.target.files)
    event.target.value = ''
  }

  async function handleComplete(): Promise<void> {
    await completeInspection()
  }

  function selectSortMode(mode: SortMode): void {
    setSortMode(mode)
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,231,191,0.75),_transparent_32%),linear-gradient(180deg,_#f9f5ec_0%,_#efe5d4_48%,_#e0d2b6_100%)] text-stone-950">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-32 pt-4">
        <header className="grid-pattern rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-[0_25px_80px_rgba(92,64,28,0.16)] backdrop-blur">
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

          <div className="mt-5 space-y-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <SortButton active={sortMode === 'route'} onClick={() => selectSortMode('route')}>
                По маршруту
              </SortButton>
              <SortButton active={sortMode === 'status'} onClick={() => selectSortMode('status')}>
                По статусу
              </SortButton>
              <SortButton active={sortMode === 'priority'} onClick={() => selectSortMode('priority')}>
                По приоритету
              </SortButton>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => void refreshPlan()}
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
                onClick={() => void retryFailed()}
                className="h-12 rounded-2xl px-4"
              >
                <CloudUpload className="size-4" />
                Повторить
              </Button>
            </div>
          </div>
        </header>

        {notice ? (
          <button
            type="button"
            onClick={dismissNotice}
            className={`mt-4 flex w-full items-start gap-3 rounded-[1.5rem] border px-4 py-3 text-left shadow-sm ${
              notice.tone === 'error' || notice.tone === 'defect'
                ? 'border-rose-200 bg-rose-50 text-rose-900'
                : notice.tone === 'ok'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-stone-200 bg-white/90 text-stone-800'
            }`}
          >
            {notice.tone === 'error' || notice.tone === 'defect' ? <CircleAlert className="mt-0.5 size-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" />}
            <span className="text-sm font-medium">{notice.message}</span>
          </button>
        ) : null}

        <section className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">План на сегодня</h2>
            <div className="inline-flex items-center gap-2 text-sm text-stone-600">
              <Route className="size-4" />
              Текущий маршрут
            </div>
          </div>

          <div className="space-y-3">
            {orderedEquipmentIds.map((equipmentId, index) => {
              const item = equipment[equipmentId]
              const draft = Object.values(drafts).find((entry) => entry.equipmentId === equipmentId)
              const template = item ? templates[item.checklistTemplateId] : undefined
              const status = getVisualStatus(draft)
              const completion = template ? getCompletion(template, draft) : { done: 0, total: 0 }

              if (!item) {
                return null
              }

              return (
                <button
                  key={equipmentId}
                  type="button"
                  onClick={() => {
                    startTransition(() => {
                      void selectEquipment(equipmentId)
                    })
                  }}
                  className={`route-card w-full rounded-[1.75rem] border p-4 text-left shadow-sm transition ${getVisualTone(status)} ${selectedEquipmentId === equipmentId ? 'ring-2 ring-stone-900/10' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex size-8 items-center justify-center rounded-2xl bg-white/80 text-sm font-bold text-stone-900">
                          {index + 1}
                        </span>
                        <span className="rounded-full border border-black/10 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-stone-700">
                          {getStatusLabel(status)}
                        </span>
                      </div>
                      <h3 className="mt-3 text-lg font-semibold">{item.name}</h3>
                      <p className="mt-1 text-sm text-stone-600">{item.location}</p>
                    </div>
                    <div className="text-right text-sm text-stone-600">
                      <p>{getPriorityLabel(item.priority)}</p>
                      <p className="mt-2">{completion.done}/{completion.total}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-stone-600">
                    <span className="rounded-full bg-white/70 px-3 py-1">QR {draft?.qrStatus === 'matched' ? 'сканирован' : 'ожидается'}</span>
                    {draft?.recordedAt ? (
                      <span className="rounded-full bg-white/70 px-3 py-1">Записан {formatTime(draft.recordedAt)}</span>
                    ) : null}
                    <span className="rounded-full bg-white/70 px-3 py-1">{draft ? getSyncLabel(draft.syncStatus) : 'Без черновика'}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <section className="mt-5 flex-1 rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-[0_24px_72px_rgba(92,64,28,0.12)] backdrop-blur">
          {currentEquipment && currentTemplate && currentDraft ? (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-600">
                    <ListOrdered className="size-3.5" />
                    Текущий объект
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold">{currentEquipment.name}</h2>
                  <p className="mt-1 text-sm text-stone-600">{currentEquipment.location}</p>
                </div>
                <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${syncTone}`}>
                  {syncedLabel}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <article className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4">
                  <p className="text-xs text-stone-500">QR-код</p>
                  <p className="mt-2 text-sm font-semibold">{currentEquipment.expectedQrCode}</p>
                  <p className="mt-2 text-xs text-stone-500">
                    {currentDraft.scannedAt ? `Отсканирован в ${formatTime(currentDraft.scannedAt)}` : 'Ещё не подтверждён'}
                  </p>
                </article>
                <article className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4">
                  <p className="text-xs text-stone-500">Черновик</p>
                  <p className="mt-2 text-sm font-semibold">Сохранён {formatTime(currentDraft.lastSavedLocallyAt)}</p>
                  <p className="mt-2 text-xs text-stone-500">
                    {currentDraft.recordedAt ? `Осмотр записан ${formatDateTime(currentDraft.recordedAt)}` : 'Осмотр ещё не завершён'}
                  </p>
                </article>
              </div>

              <section className="space-y-3 rounded-[1.75rem] border border-stone-200 bg-stone-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">QR-подтверждение</h3>
                    <p className="mt-1 text-sm text-stone-600">
                      Без скана чеклист и завершение осмотра заблокированы.
                    </p>
                  </div>
                  <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                    currentDraft.qrStatus === 'matched'
                      ? 'border-emerald-300 bg-emerald-100 text-emerald-900'
                      : currentDraft.qrStatus === 'mismatch'
                        ? 'border-rose-300 bg-rose-100 text-rose-900'
                        : 'border-amber-300 bg-amber-100 text-amber-900'
                  }`}>
                    <QrCode className="size-3.5" />
                    {currentDraft.qrStatus === 'matched' ? 'QR scanned' : currentDraft.qrStatus === 'mismatch' ? 'QR не совпал' : 'QR обязателен'}
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    size="lg"
                    onClick={() => setScannerOpen(true)}
                    className="h-12 flex-1 rounded-2xl"
                    disabled={Boolean(currentDraft.completedAt)}
                  >
                    <QrCode className="size-4" />
                    Сканировать QR
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    className="h-12 rounded-2xl px-4"
                    disabled
                  >
                    <Mic className="size-4" />
                    Быстрый ввод
                  </Button>
                </div>
                {scannerOpen ? (
                  <QrScannerPanel
                    expectedCode={currentEquipment.expectedQrCode}
                    onClose={() => setScannerOpen(false)}
                    onDetected={async (code) => {
                      await handleQrScan(code)
                    }}
                  />
                ) : null}
              </section>

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
                    disabled={Boolean(currentDraft.completedAt)}
                    onClick={() => void updateResultStatus('ok')}
                    className={`min-h-14 rounded-2xl border px-4 py-3 text-base font-semibold ${
                      currentDraft.resultStatus === 'ok'
                        ? 'border-emerald-500 bg-emerald-600 text-white'
                        : 'border-stone-200 bg-white text-stone-800'
                    }`}
                  >
                    Норма
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(currentDraft.completedAt)}
                    onClick={() => void updateResultStatus('defect')}
                    className={`min-h-14 rounded-2xl border px-4 py-3 text-base font-semibold ${
                      currentDraft.resultStatus === 'defect'
                        ? 'border-rose-500 bg-rose-600 text-white'
                        : 'border-stone-200 bg-white text-stone-800'
                    }`}
                  >
                    Дефект
                  </button>
                </div>
              </section>

              <section className={`space-y-3 ${draftBlocked ? 'pointer-events-none opacity-60' : ''}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">Чеклист осмотра</h3>
                    <p className="mt-1 text-sm text-stone-600">
                      Заполнено {currentCompletion.done} из {currentCompletion.total}
                    </p>
                  </div>
                  <div className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold text-stone-600">
                    {currentTemplate.name}
                  </div>
                </div>
                {currentTemplate.items.map((item) => (
                  <ChecklistField
                    key={item.id}
                    item={item}
                    value={currentDraft.checklistValues[item.id]}
                    error={currentDraft.checklistErrors[item.id]}
                    disabled={draftBlocked || Boolean(currentDraft.completedAt)}
                    onChange={(value) => {
                      void updateChecklistValue(item.id, value)
                    }}
                  />
                ))}
              </section>

              <section className={`space-y-3 rounded-[1.75rem] border border-stone-200 bg-stone-50 p-4 ${draftBlocked ? 'pointer-events-none opacity-60' : ''}`}>
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
                    disabled={draftBlocked || Boolean(currentDraft.completedAt)}
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
                {currentDraft.resultStatus === 'defect' && currentDraft.photos.length === 0 ? (
                  <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                    При выбранном статусе «Дефект» добавьте минимум одно фото.
                  </p>
                ) : null}
                {currentDraft.photos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {currentDraft.photos.map((photo) => (
                      <PhotoTile
                        key={photo.id}
                        photo={photo}
                        disabled={Boolean(currentDraft.completedAt)}
                        onRemove={(photoId) => {
                          void removePhoto(photoId)
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

              {currentDraft.lastSyncError ? (
                <p className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  Ошибка синхронизации: {currentDraft.lastSyncError}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 text-center text-stone-500">
              <Route className="size-8" />
              <p className="max-w-xs text-sm">
                План ещё не загружен. Обновите данные или дождитесь инициализации.
              </p>
            </div>
          )}
        </section>
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-white/70 bg-white/88 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-stone-800">
              {currentEquipment ? currentEquipment.name : 'Нет выбранного объекта'}
            </p>
            <p className="mt-1 text-xs text-stone-500">
              {currentDraft?.completedAt ? 'Осмотр записан' : 'Завершение не ждёт ответа сервера'}
            </p>
          </div>
          <Button
            type="button"
            size="lg"
            onClick={() => void handleComplete()}
            disabled={!initialized || Boolean(currentDraft?.completedAt) || !currentDraft}
            className="h-14 min-w-[12rem] rounded-[1.3rem] bg-stone-950 text-base text-white hover:bg-stone-800"
          >
            <CheckCircle2 className="size-5" />
            Завершить
          </Button>
        </div>
      </footer>
    </div>
  )
}

export default App
