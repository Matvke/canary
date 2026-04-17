import type { ChecklistItemTemplate, ChecklistTemplate, InspectionDraft, ValidationResult } from '@/types'
import { isValuePresent, normalizeQrCode, parseNumberValue } from '@/lib/app-utils'

function validateItem(item: ChecklistItemTemplate, value: InspectionDraft['checklistValues'][string]): string | undefined {
  if (item.required && !isValuePresent(value, item.type)) {
    return 'Поле обязательно'
  }

  if (item.type === 'number') {
    if (!isValuePresent(value, item.type)) {
      return undefined
    }

    const numberValue = parseNumberValue(value)
    if (numberValue === null) {
      return 'Введите число'
    }

    if (item.range?.min !== undefined && numberValue < item.range.min) {
      return `Минимум ${item.range.min}${item.range.unit ? ` ${item.range.unit}` : ''}`
    }

    if (item.range?.max !== undefined && numberValue > item.range.max) {
      return `Максимум ${item.range.max}${item.range.unit ? ` ${item.range.unit}` : ''}`
    }
  }

  if (item.type === 'select' && typeof value === 'string' && item.options) {
    const values = item.options.map((option) => option.value)
    if (value && !values.includes(value)) {
      return 'Выберите допустимое значение'
    }
  }

  return undefined
}

export function getFieldError(
  template: ChecklistTemplate,
  itemId: string,
  value: InspectionDraft['checklistValues'][string],
): string | undefined {
  const item = template.items.find((entry) => entry.id === itemId)
  if (!item) {
    return undefined
  }

  return validateItem(item, value)
}

export function validateDraft(
  draft: InspectionDraft,
  template: ChecklistTemplate,
  expectedQrCode: string,
): ValidationResult {
  const fieldErrors: Record<string, string> = {}
  const globalErrors: string[] = []

  for (const item of template.items) {
    const error = validateItem(item, draft.checklistValues[item.id])
    if (error) {
      fieldErrors[item.id] = error
    }
  }

  if (draft.qrStatus !== 'matched' || normalizeQrCode(draft.scannedQrCode ?? '') !== normalizeQrCode(expectedQrCode)) {
    globalErrors.push('Сначала подтвердите оборудование QR-кодом.')
  }

  if (!draft.resultStatus) {
    globalErrors.push('Укажите итоговое состояние оборудования.')
  }

  if (draft.resultStatus === 'defect' && draft.photos.length === 0) {
    globalErrors.push('При дефекте требуется минимум одна фотография.')
  }

  return {
    isValid: Object.keys(fieldErrors).length === 0 && globalErrors.length === 0,
    fieldErrors,
    globalErrors,
  }
}
