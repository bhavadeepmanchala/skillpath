import React from "react"
import { Filter } from "lucide-react"

export interface FilterBarProps {
  children: React.ReactNode
  onReset?: () => void
  isFiltered?: boolean
  className?: string
}

export function FilterBar({
  children,
  onReset,
  isFiltered = false,
  className = "",
}: FilterBarProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3 text-card-foreground shadow-resting ${className}`}
    >
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mr-1">
        <Filter className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Filters</span>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 flex-1">{children}</div>

      {isFiltered && onReset && (
        <button
          type="button"
          onClick={onReset}
          className="text-xs font-medium text-muted-foreground hover:text-foreground underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded px-1 transition-colors duration-120 active:translate-y-[1px]"
        >
          Reset
        </button>
      )}
    </div>
  )
}

export interface SelectFieldProps {
  id: string
  label: string
  value: string | number
  onChange: (value: string) => void
  options: { label: string; value: string | number }[]
  disabled?: boolean
  className?: string
}

export function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  disabled = false,
  className = "",
}: SelectFieldProps) {
  return (
    <div className={`flex items-center gap-2 text-xs ${className}`}>
      <label htmlFor={id} className="text-muted-foreground font-medium shrink-0">
        {label}:
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground shadow-resting focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 transition-colors duration-120"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
