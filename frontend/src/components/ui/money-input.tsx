import { useEffect, useRef, useState } from "react"

import { Input } from "./input"
import { cn } from "@/lib/utils"

interface MoneyInputProps {
  value: number | null | undefined
  onChange: (value: number | undefined) => void
  placeholder?: string
  suffix?: string
  className?: string
  min?: number
  max?: number
  disabled?: boolean
  /** ID and name forwarded for accessibility / form integration */
  id?: string
  name?: string
}

/**
 * Money input that displays thousand separators (1,200,000) when blurred,
 * and switches to raw editable form (1200000) when focused so users can
 * easily edit without fighting commas.
 *
 * Pairs naturally with react-hook-form via Controller:
 *
 *   <Controller name="pipeline_value" control={control} render={({ field }) =>
 *     <MoneyInput value={field.value} onChange={field.onChange} />
 *   } />
 */
export function MoneyInput({
  value, onChange, placeholder, suffix = "USD", className,
  min = 0, max, disabled, id, name,
}: MoneyInputProps) {
  const [focused, setFocused] = useState(false)
  const [raw, setRaw] = useState<string>(value != null ? String(value) : "")
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync raw text whenever the external value changes AND user isn't editing
  useEffect(() => {
    if (!focused) setRaw(value != null ? String(value) : "")
  }, [value, focused])

  const display = focused
    ? raw
    : value != null && !Number.isNaN(value)
      ? Number(value).toLocaleString("en-US")
      : ""

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={display}
        placeholder={placeholder}
        disabled={disabled}
        id={id}
        name={name}
        onFocus={() => {
          setFocused(true)
          // Use raw (no commas) while editing
          setRaw(value != null ? String(value) : "")
        }}
        onBlur={() => {
          setFocused(false)
          // Clamp to min/max on blur
          if (value != null) {
            if (min != null && value < min) onChange(min)
            else if (max != null && value > max) onChange(max)
          }
        }}
        onChange={e => {
          const cleaned = e.target.value.replace(/[^0-9.-]/g, "")
          setRaw(cleaned)
          if (cleaned === "" || cleaned === "-") {
            onChange(undefined)
            return
          }
          const num = parseFloat(cleaned)
          if (!Number.isNaN(num)) onChange(num)
        }}
        className={cn(suffix ? "pr-12" : "", className)}
      />
      {suffix && (
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  )
}
