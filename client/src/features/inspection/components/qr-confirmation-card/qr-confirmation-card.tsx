import {QrCode} from 'lucide-react'
import {useState} from 'react'

import {Button} from '@/components/ui/button'
import {QrScannerPanel} from '@/features/qr/components/qr-scanner-panel/qr-scanner-panel'
import type {EquipmentRecord, InspectionDraft} from '@/types'

interface QrConfirmationCardProps {
  draft: InspectionDraft
  equipment: EquipmentRecord
  onQrScan: (code: string) => Promise<{ matched: boolean; message: string }>
}

export function QrConfirmationCard({draft, equipment, onQrScan}: QrConfirmationCardProps) {
  const [scannerOpen, setScannerOpen] = useState(false)

  const qrTone = draft.qrStatus === 'matched'
    ? 'border-emerald-300 bg-emerald-100 text-emerald-900'
    : draft.qrStatus === 'mismatch'
      ? 'border-rose-300 bg-rose-100 text-rose-900'
      : 'border-amber-300 bg-amber-100 text-amber-900'

  const qrLabel = draft.qrStatus === 'matched'
    ? 'QR scanned'
    : draft.qrStatus === 'mismatch'
      ? 'QR не совпал'
      : 'QR обязателен'

  return (
    <section className="space-y-3 rounded-[1.75rem] border border-stone-200 bg-stone-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">QR-подтверждение</h3>
          <p className="mt-1 text-sm text-stone-600">
            Без скана чеклист и завершение осмотра заблокированы.
          </p>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${qrTone}`}>
          <QrCode className="size-3.5"/>
          {qrLabel}
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          size="lg"
          onClick={() => setScannerOpen(true)}
          className="h-12 flex-1 rounded-2xl"
          disabled={Boolean(draft.completedAt)}
        >
          <QrCode className="size-4"/>
          Сканировать QR
        </Button>
      </div>

      {scannerOpen ? (
        <QrScannerPanel
          expectedCode={equipment.expectedQrCode}
          onClose={() => setScannerOpen(false)}
          onDetected={async (code) => {
            await onQrScan(code)
          }}
        />
      ) : null}
    </section>
  )
}
