import { useMemo } from "react"

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "./select"
import { Button } from "./button"

/**
 * QuarterPicker — stores opening target as "Q4 2026" string.
 *
 * Why a picker (not free text or Master Data dropdown):
 *  - Master Data list goes stale (Q3 2024 still shown in 2026 dropdowns).
 *  - Admin shouldn't have to add quarters each year — system derives them.
 *  - Free text leads to inconsistent format ("Q4-26", "Q4/2026", "Q42026").
 *  - Quarter precision is industry standard for hotel deal pipelines —
 *    exact opening date isn't knowable 2 years out.
 *
 * Output format: "Q1 2026" | "Q2 2026" | "Q3 2026" | "Q4 2026" | "" | "TBD"
 */

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const
type Quarter = typeof QUARTERS[number] | ""

interface ParsedTarget {
  quarter: Quarter
  year: number | null
}

function parse(value?: string | null): ParsedTarget {
  if (!value) return { quarter: "", year: null }
  // Match "Q4 2026" or "Q4 2026" or even "Q4-2026"
  const m = value.match(/Q([1-4])[\s\-_/]*(\d{4})/i)
  if (m) return { quarter: `Q${m[1]}` as Quarter, year: parseInt(m[2], 10) }
  return { quarter: "", year: null }
}

function format(quarter: Quarter, year: number | null): string {
  if (!quarter || !year) return ""
  return `${quarter} ${year}`
}

interface Props {
  value?: string | null
  onChange: (value: string) => void
  /** Number of years from current year to allow (default +6, so 2026..2032). */
  yearsAhead?: number
  /** Number of past years to allow (default 2, for already-opened deals). */
  yearsBack?: number
  /** Show "TBD" option */
  allowTbd?: boolean
  className?: string
}

export function QuarterPicker({
  value, onChange, yearsAhead = 6, yearsBack = 2, allowTbd = true, className,
}: Props) {
  const { quarter, year } = useMemo(() => parse(value), [value])
  const isTbd = value === "TBD"

  const years = useMemo(() => {
    const current = new Date().getFullYear()
    const list: number[] = []
    for (let y = current - yearsBack; y <= current + yearsAhead; y++) list.push(y)
    return list
  }, [yearsAhead, yearsBack])

  const handleQuarter = (q: Quarter) => {
    if (q === "" || !year) {
      // need both — auto-set year to current+1 as sensible default
      const fallbackYear = year ?? new Date().getFullYear() + 1
      onChange(format(q, fallbackYear))
    } else {
      onChange(format(q, year))
    }
  }

  const handleYear = (y: string) => {
    const yi = parseInt(y, 10)
    const fallbackQ = (quarter || "Q4") as Quarter
    onChange(format(fallbackQ, yi))
  }

  const setTbd = () => onChange("TBD")
  const clear = () => onChange("")

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <Select value={isTbd ? "__tbd__" : quarter} onValueChange={(v) => v === "__tbd__" ? setTbd() : handleQuarter(v as Quarter)}>
        <SelectTrigger className="h-9 w-[100px]"><SelectValue placeholder="Quarter" /></SelectTrigger>
        <SelectContent>
          {QUARTERS.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
          {allowTbd && <SelectItem value="__tbd__">TBD</SelectItem>}
        </SelectContent>
      </Select>
      <Select
        value={isTbd ? "" : (year ? String(year) : "")}
        onValueChange={handleYear}
        disabled={isTbd}
      >
        <SelectTrigger className="h-9 w-[100px]"><SelectValue placeholder="Year" /></SelectTrigger>
        <SelectContent>
          {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
        </SelectContent>
      </Select>
      {value && (
        <Button type="button" variant="ghost" size="sm" className="h-9 text-[10.5px]"
          onClick={clear}>
          Clear
        </Button>
      )}
    </div>
  )
}

// ── Display helpers ─────────────────────────────────────────────────────────

/** Returns a Tailwind class string based on how far in the future the target is. */
export function quarterTone(value?: string | null): string {
  if (!value || value === "TBD") return "text-muted-foreground italic"
  const { quarter, year } = parse(value)
  if (!quarter || !year) return "text-muted-foreground"
  const qMonth = { Q1: 0, Q2: 3, Q3: 6, Q4: 9 }[quarter as Exclude<Quarter, "">]
  const targetDate = new Date(year, qMonth, 1)
  const now = new Date()
  const monthsAway = (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth())
  if (monthsAway < 0) return "text-muted-foreground italic line-through"  // past
  if (monthsAway <= 6) return "text-amber-700 font-semibold"                // soon
  if (monthsAway <= 18) return "text-foreground font-medium"                 // near
  return "text-muted-foreground"                                             // far
}

/** Tags an opening target with a short label about timing. */
export function quarterLabel(value?: string | null): string {
  if (!value) return "—"
  if (value === "TBD") return "TBD"
  const { quarter, year } = parse(value)
  if (!quarter || !year) return value
  const qMonth = { Q1: 0, Q2: 3, Q3: 6, Q4: 9 }[quarter as Exclude<Quarter, "">]
  const targetDate = new Date(year, qMonth, 1)
  const now = new Date()
  const monthsAway = (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth())
  if (monthsAway < 0) return `${value} (past)`
  if (monthsAway === 0) return `${value} (this quarter)`
  if (monthsAway <= 12) return `${value} (~${monthsAway}mo)`
  return value
}
