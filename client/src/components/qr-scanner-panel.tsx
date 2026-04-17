import { Camera, ScanLine, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { normalizeQrCode } from '@/lib/app-utils'

interface QrScannerPanelProps {
  expectedCode: string
  onClose: () => void
  onDetected: (code: string) => void | Promise<void>
}

export function QrScannerPanel({ expectedCode, onClose, onDetected }: QrScannerPanelProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [manualCode, setManualCode] = useState('')
  const [error, setError] = useState('')
  const [active, setActive] = useState(false)

  useEffect(() => {
    let cancelled = false
    let timeoutId = 0

    async function startCamera(): Promise<void> {
      if (!('mediaDevices' in navigator) || !videoRef.current) {
        setError('Камера недоступна. Введите QR вручную.')
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
          },
          audio: false,
        })

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setActive(true)

        const BarcodeDetector = window.BarcodeDetector
        if (!BarcodeDetector) {
          setError('Сканирование не поддерживается браузером. Введите QR вручную.')
          return
        }

        const detector = new BarcodeDetector({ formats: ['qr_code'] })
        const scan = async () => {
          if (cancelled || !videoRef.current) {
            return
          }

          try {
            const codes = await detector.detect(videoRef.current)
            const code = codes[0]?.rawValue?.trim()
            if (code) {
              await onDetected(code)
              onClose()
              return
            }
          } catch {
            setError('Не удалось считать QR. Можно ввести код вручную.')
          }

          timeoutId = window.setTimeout(scan, 400)
        }

        timeoutId = window.setTimeout(scan, 600)
      } catch {
        setError('Нет доступа к камере. Разрешите доступ или введите QR вручную.')
      }
    }

    void startCamera()

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [onClose, onDetected])

  async function handleManualSubmit(): Promise<void> {
    if (!manualCode.trim()) {
      return
    }

    await onDetected(normalizeQrCode(manualCode))
    onClose()
  }

  return (
    <section className="scanner-shell space-y-4 rounded-[2rem] border border-stone-300 bg-stone-950 p-4 text-white shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-stone-400">QR-контроль</p>
          <h3 className="mt-1 text-lg font-semibold">Подтвердите оборудование</h3>
          <p className="mt-2 text-sm text-stone-300">Ожидается код {expectedCode}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="size-11 rounded-2xl border border-white/10 bg-white/5 text-white hover:bg-white/10"
        >
          <X className="size-5" />
        </Button>
      </div>

      <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-black">
        <video ref={videoRef} muted playsInline className="aspect-square w-full object-cover" />
        <div className="pointer-events-none absolute inset-0 border-[1.5px] border-white/10">
          <div className="scanner-frame absolute inset-6 rounded-[1.5rem] border-2 border-amber-300/80" />
        </div>
        {!active ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 text-sm text-stone-200">
            <Camera className="size-7" />
            Подключаю камеру…
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-2xl border border-amber-400/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
          {error}
        </p>
      ) : null}

      <div className="space-y-3 rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
        <label className="block text-sm text-stone-300">
          Ручной ввод QR
          <input
            type="text"
            value={manualCode}
            onChange={(event) => setManualCode(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void handleManualSubmit()
              }
            }}
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="Например, CANARY-EQ-101"
            className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/10 px-4 text-base text-white outline-none placeholder:text-stone-500"
          />
        </label>
        <Button
          type="button"
          size="lg"
          onClick={() => void handleManualSubmit()}
          className="h-12 w-full rounded-2xl bg-amber-300 text-stone-950 hover:bg-amber-200"
        >
          <ScanLine className="size-4" />
          Подтвердить код
        </Button>
      </div>
    </section>
  )
}
