import { useEffect, useEffectEvent, useMemo } from 'react'

import {
  getCompletion,
  getSyncLabel,
  getSyncTone,
  getVisualStatus,
  sortEquipmentIds,
} from '@/lib/app-utils'
import { useAppStore } from '@/store/use-app-store'
import type { SortMode } from '@/types'

export function useInspectionAppController() {
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

  const currentCompletion = currentTemplate
    ? getCompletion(currentTemplate, currentDraft ?? undefined)
    : { done: 0, total: 0 }

  const draftBlocked = currentDraft?.qrStatus !== 'matched'
  const syncedLabel = currentDraft ? getSyncLabel(currentDraft.syncStatus) : 'Нет данных'
  const syncTone = currentDraft ? getSyncTone(currentDraft.syncStatus) : 'bg-stone-100 text-stone-700 border-stone-200'

  function selectSortMode(mode: SortMode): void {
    setSortMode(mode)
  }

  return {
    actions: {
      addPhotos,
      completeInspection,
      dismissNotice,
      handleQrScan,
      refreshPlan,
      removePhoto,
      retryFailed,
      selectEquipment,
      selectSortMode,
      updateChecklistValue,
      updateResultStatus,
    },
    state: {
      completedCount,
      currentCompletion,
      currentDraft,
      currentEquipment,
      currentTemplate,
      draftBlocked,
      drafts,
      equipment,
      initialized,
      loading,
      notice,
      online,
      orderedEquipmentIds,
      plan,
      selectedEquipmentId,
      sortMode,
      sync,
      syncTone,
      syncedLabel,
      templates,
    },
  }
}
