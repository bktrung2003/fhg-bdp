import {
  type ColumnDef,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Settings2,
  Check,
} from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  /** Column IDs to pin/freeze on right (typically "actions") */
  stickyRightColumns?: string[]
  /** localStorage key to persist column visibility */
  storageKey?: string
  /** Default hidden columns (only used if no saved visibility) */
  defaultHidden?: string[]
}

export function DataTable<TData, TValue>({
  columns,
  data,
  stickyRightColumns = [],
  storageKey,
  defaultHidden = [],
}: DataTableProps<TData, TValue>) {
  // Column visibility state with localStorage persistence
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    if (storageKey && typeof window !== "undefined") {
      const saved = localStorage.getItem(`cols:${storageKey}`)
      if (saved) {
        try { return JSON.parse(saved) } catch {}
      }
    }
    // Initial state — hide defaults
    const state: VisibilityState = {}
    defaultHidden.forEach(id => { state[id] = false })
    return state
  })

  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(`cols:${storageKey}`, JSON.stringify(columnVisibility))
    }
  }, [columnVisibility, storageKey])

  const table = useReactTable({
    data,
    columns,
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const allColumns = table.getAllColumns().filter(c => c.getCanHide())

  // Header cell — sticky support
  const headerCell = (header: any) => {
    const isSticky = stickyRightColumns.includes(header.column.id)
    return (
      <TableHead
        key={header.id}
        className={isSticky ? "sticky right-0 bg-card border-l shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] z-10" : ""}
      >
        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
      </TableHead>
    )
  }

  // Body cell — sticky support
  const bodyCell = (cell: any) => {
    const isSticky = stickyRightColumns.includes(cell.column.id)
    return (
      <TableCell
        key={cell.id}
        className={isSticky ? "sticky right-0 bg-card border-l shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] z-10" : ""}
      >
        {flexRender(cell.column.columnDef.cell, cell.getContext())}
      </TableCell>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar: column picker */}
      <div className="flex items-center justify-end gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <Settings2 className="h-3.5 w-3.5 mr-1.5" />
              Columns
              <span className="ml-1.5 text-[10px] text-muted-foreground">
                {table.getVisibleLeafColumns().length}/{allColumns.length}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {allColumns.map(col => {
              const headerLabel = typeof col.columnDef.header === "string"
                ? col.columnDef.header
                : col.id
              return (
                <DropdownMenuItem
                  key={col.id}
                  onSelect={(e) => { e.preventDefault(); col.toggleVisibility() }}
                  className="capitalize cursor-pointer"
                >
                  <span className="w-4 mr-2">
                    {col.getIsVisible() && <Check className="h-3.5 w-3.5" />}
                  </span>
                  {headerLabel || col.id}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map(headerCell)}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map(bodyCell)}
              </TableRow>
            ))
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={table.getVisibleLeafColumns().length}
                className="h-32 text-center text-muted-foreground"
              >
                No results found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {table.getPageCount() > 1 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border-t bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Showing{" "}
              {table.getState().pagination.pageIndex *
                table.getState().pagination.pageSize +
                1}{" "}
              to{" "}
              {Math.min(
                (table.getState().pagination.pageIndex + 1) *
                  table.getState().pagination.pageSize,
                data.length,
              )}{" "}
              of{" "}
              <span className="font-medium text-foreground">{data.length}</span>{" "}
              entries
            </div>
            <div className="flex items-center gap-x-2">
              <p className="text-sm text-muted-foreground">Rows per page</p>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => { table.setPageSize(Number(value)) }}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue placeholder={table.getState().pagination.pageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                  {[5, 10, 25, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-x-6">
            <div className="flex items-center gap-x-1 text-sm text-muted-foreground">
              <span>Page</span>
              <span className="font-medium text-foreground">{table.getState().pagination.pageIndex + 1}</span>
              <span>of</span>
              <span className="font-medium text-foreground">{table.getPageCount()}</span>
            </div>

            <div className="flex items-center gap-x-1">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
