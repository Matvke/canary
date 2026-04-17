interface SortButtonProps {
  active: boolean
  children: string
  onClick: () => void
}

export function SortButton({ active, children, onClick }: SortButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'min-h-11 rounded-2xl border px-5 py-2 text-sm font-semibold transition',
        active
          ? 'border-stone-900 bg-stone-900 text-white'
          : 'border-stone-200 bg-white text-stone-700',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
