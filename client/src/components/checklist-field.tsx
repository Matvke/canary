import { Check, ChevronDown } from 'lucide-react'

import { VoiceInputButton } from '@/components/voice-input-button'
import type { ChecklistItemTemplate, StoredChecklistValue } from '@/types'

interface ChecklistFieldProps {
  disabled?: boolean
  error?: string
  item: ChecklistItemTemplate
  onChange: (value: StoredChecklistValue) => void
  value: StoredChecklistValue
}

function OptionChip({
  active,
  children,
  disabled,
  onClick,
}: {
  active: boolean
  children: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        'flex min-h-12 items-center justify-center rounded-2xl border px-4 py-3 text-sm font-semibold transition',
        active
          ? 'border-stone-900 bg-stone-900 text-white'
          : 'border-stone-200 bg-white text-stone-700',
        disabled ? 'cursor-not-allowed opacity-50' : 'active:translate-y-px',
      ].join(' ')}
    >
      {active ? <Check className="mr-2 size-4" /> : null}
      {children}
    </button>
  )
}

export function ChecklistField({ disabled, error, item, onChange, value }: ChecklistFieldProps) {
  return (
    <article className={`space-y-3 rounded-[1.75rem] border p-4 shadow-sm ${error ? 'border-rose-300 bg-rose-50/80' : 'border-stone-200 bg-white/90'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-stone-950">{item.label}</h3>
          <p className="mt-1 text-sm text-stone-500">
            {item.required ? 'Обязательно' : 'Необязательно'}
            {item.range?.unit ? ` • ${item.range.unit}` : ''}
          </p>
        </div>
        {item.required ? (
          <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-stone-600">
            Контроль
          </span>
        ) : null}
      </div>

      {item.type === 'number' ? (
        <label className="block">
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              value={typeof value === 'string' ? value : ''}
              onChange={(event) => onChange(event.target.value)}
              disabled={disabled}
              placeholder={item.placeholder ?? 'Введите значение'}
              className="h-14 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 pr-16 text-lg font-semibold text-stone-950 outline-none transition focus:border-stone-950"
            />
            {item.range?.unit ? (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-stone-500">
                {item.range.unit}
              </span>
            ) : null}
          </div>
          {item.range ? (
            <p className="mt-2 text-xs text-stone-500">
              Допустимо {item.range.min ?? '...'}–{item.range.max ?? '...'} {item.range.unit ?? ''}
            </p>
          ) : null}
        </label>
      ) : null}

      {item.type === 'select' ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {item.options?.map((option) => (
            <OptionChip
              key={option.value}
              active={value === option.value}
              disabled={disabled}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </OptionChip>
          ))}
        </div>
      ) : null}

      {item.type === 'boolean' ? (
        <div className="grid grid-cols-2 gap-2">
          <OptionChip active={value === true} disabled={disabled} onClick={() => onChange(true)}>
            Да
          </OptionChip>
          <OptionChip active={value === false} disabled={disabled} onClick={() => onChange(false)}>
            Нет
          </OptionChip>
        </div>
      ) : null}

      {item.type === 'text' ? (
        <div className="space-y-3">
          <textarea
            value={typeof value === 'string' ? value : ''}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            rows={4}
            placeholder={item.placeholder ?? 'Введите комментарий'}
            className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-base text-stone-950 outline-none transition focus:border-stone-950"
          />
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2">
            <div className="text-sm text-stone-500">
              Микрофон заполнит поле автоматически.
            </div>
            <VoiceInputButton
              disabled={disabled}
              onResult={(text) => onChange(text)}
            />
          </div>
        </div>
      ) : null}

      {item.hint ? (
        <p className="flex items-center gap-2 text-xs text-stone-500">
          <ChevronDown className="size-3.5 rotate-[-90deg]" />
          {item.hint}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-2xl border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-700">
          {error}
        </p>
      ) : null}
    </article>
  )
}
