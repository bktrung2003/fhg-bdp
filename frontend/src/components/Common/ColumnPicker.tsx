import { Settings2, Check } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/** Map from column id → human label */
export interface ColumnSpec {
  id: string
  label: string
  /** Cannot be hidden (e.g. actions) */
  fixed?: boolean
}

interface Props {
  columns: ColumnSpec[]
  /** Current visibility state { columnId: true/false } */
  visibility: Record<string, boolean>
  onVisibilityChange: (next: Record<string, boolean>) => void
}

export function ColumnPicker({ columns, visibility, onVisibilityChange }: Props) {
  // Default to visible if not in state
  const isVisible = (id: string) => visibility[id] !== false

  const toggle = (id: string) => {
    onVisibilityChange({
      ...visibility,
      [id]: !isVisible(id),
    })
  }

  const visibleCount = columns.filter(c => isVisible(c.id)).length

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          <Settings2 className="h-3.5 w-3.5 mr-1.5" />
          Columns
          <span className="ml-1.5 text-[10px] text-muted-foreground">
            {visibleCount}/{columns.length}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map(col => (
          <DropdownMenuItem
            key={col.id}
            onSelect={(e) => { e.preventDefault(); if (!col.fixed) toggle(col.id) }}
            className={`cursor-pointer ${col.fixed ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <span className="w-4 mr-2 inline-flex">
              {isVisible(col.id) && <Check className="h-3.5 w-3.5" />}
            </span>
            {col.label}
            {col.fixed && <span className="ml-auto text-[10px] text-muted-foreground">always</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Hook that returns { visibility, ColumnPicker } + persists to localStorage */
export function useColumnVisibility(storageKey: string, defaultHidden: string[] = []) {
  const [visibility, setVisibility] = useState<Record<string, boolean>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`cols:${storageKey}`)
      if (saved) {
        try { return JSON.parse(saved) } catch {}
      }
    }
    const initial: Record<string, boolean> = {}
    defaultHidden.forEach(id => { initial[id] = false })
    return initial
  })

  useEffect(() => {
    localStorage.setItem(`cols:${storageKey}`, JSON.stringify(visibility))
  }, [visibility, storageKey])

  return { visibility, setVisibility }
}
