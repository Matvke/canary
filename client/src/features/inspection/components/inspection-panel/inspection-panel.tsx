import { ChecklistSection } from '@/features/inspection/components/checklist-section/checklist-section'
import { EmptyInspectionState } from '@/features/inspection/components/empty-inspection-state/empty-inspection-state'
import { InspectionHeader } from '@/features/inspection/components/inspection-header/inspection-header'
import { InspectionMetaGrid } from '@/features/inspection/components/inspection-meta-grid/inspection-meta-grid'
import { PhotoSection } from '@/features/inspection/components/photo-section/photo-section'
import { QrConfirmationCard } from '@/features/inspection/components/qr-confirmation-card/qr-confirmation-card'
import { ResultStatusCard } from '@/features/inspection/components/result-status-card/result-status-card'
import { SupervisionNotice } from '@/features/inspection/components/supervision-notice/supervision-notice'
import type {
  ChecklistTemplate,
  EquipmentRecord,
  InspectionDraft,
  ResultStatus,
  StoredChecklistValue,
} from '@/types'

interface InspectionPanelProps {
  completion: { done: number; total: number }
  draft: InspectionDraft | null
  draftBlocked: boolean
  equipment?: EquipmentRecord
  onAddPhotos: (files: FileList | File[]) => Promise<void>
  onQrScan: (code: string) => Promise<{ matched: boolean; message: string }>
  onRemovePhoto: (photoId: string) => Promise<void>
  onUpdateChecklistValue: (itemId: string, value: StoredChecklistValue) => Promise<void>
  onUpdateResultStatus: (status: ResultStatus | null) => Promise<void>
  syncLabel: string
  syncTone: string
  template?: ChecklistTemplate
}

export function InspectionPanel({
  completion,
  draft,
  draftBlocked,
  equipment,
  onAddPhotos,
  onQrScan,
  onRemovePhoto,
  onUpdateChecklistValue,
  onUpdateResultStatus,
  syncLabel,
  syncTone,
  template,
}: InspectionPanelProps) {
  return (
    <section className="mt-5 flex-1 rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-[0_24px_72px_rgba(92,64,28,0.12)] backdrop-blur">
      {equipment && template && draft ? (
        <div className="space-y-5">
          <InspectionHeader equipment={equipment} syncLabel={syncLabel} syncTone={syncTone} />
          <SupervisionNotice draft={draft} />
          <InspectionMetaGrid draft={draft} equipment={equipment} />
          <QrConfirmationCard draft={draft} equipment={equipment} onQrScan={onQrScan} />
          <ResultStatusCard draft={draft} onUpdateResultStatus={onUpdateResultStatus} />
          <ChecklistSection
            completion={completion}
            disabled={draftBlocked}
            draft={draft}
            template={template}
            onUpdateChecklistValue={onUpdateChecklistValue}
          />
          <PhotoSection
            disabled={draftBlocked}
            draft={draft}
            onAddPhotos={onAddPhotos}
            onRemovePhoto={onRemovePhoto}
          />

          {draft.lastSyncError ? (
            <p className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              Ошибка синхронизации: {draft.lastSyncError}
            </p>
          ) : null}
        </div>
      ) : (
        <EmptyInspectionState />
      )}
    </section>
  )
}
