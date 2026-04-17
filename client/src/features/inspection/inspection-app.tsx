import './inspection-app.css'

import { BottomActionBar } from '@/features/inspection/components/bottom-action-bar/bottom-action-bar'
import { InspectionPanel } from '@/features/inspection/components/inspection-panel/inspection-panel'
import { NoticeBanner } from '@/features/inspection/components/notice-banner/notice-banner'
import { useInspectionAppController } from '@/features/inspection/hooks/use-inspection-app-controller'
import { DashboardHeader } from '@/features/plan/components/dashboard-header/dashboard-header'
import { RoutePlanSection } from '@/features/plan/components/route-plan-section/route-plan-section'

export function InspectionApp() {
  const { actions, state } = useInspectionAppController()

  return (
    <div className="inspection-app">
      <div className="inspection-app__content">
        <DashboardHeader
          completedCount={state.completedCount}
          loading={state.loading}
          online={state.online}
          plan={state.plan}
          sortMode={state.sortMode}
          sync={state.sync}
          onRefreshPlan={actions.refreshPlan}
          onRetryFailed={actions.retryFailed}
          onSortModeChange={actions.selectSortMode}
        />

        <NoticeBanner notice={state.notice} onDismiss={actions.dismissNotice} />

        <RoutePlanSection
          drafts={state.drafts}
          equipment={state.equipment}
          equipmentIds={state.orderedEquipmentIds}
          selectedEquipmentId={state.selectedEquipmentId}
          templates={state.templates}
          onSelectEquipment={actions.selectEquipment}
        />

        <InspectionPanel
          completion={state.currentCompletion}
          draft={state.currentDraft}
          draftBlocked={state.draftBlocked}
          equipment={state.currentEquipment}
          syncLabel={state.syncedLabel}
          syncTone={state.syncTone}
          template={state.currentTemplate}
          onAddPhotos={actions.addPhotos}
          onQrScan={actions.handleQrScan}
          onRemovePhoto={actions.removePhoto}
          onUpdateChecklistValue={actions.updateChecklistValue}
          onUpdateResultStatus={actions.updateResultStatus}
        />
      </div>

      <BottomActionBar
        draft={state.currentDraft}
        equipment={state.currentEquipment}
        initialized={state.initialized}
        onComplete={actions.completeInspection}
      />
    </div>
  )
}
