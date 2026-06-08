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
} from "lucide-react"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"
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
  /** Externally controlled column visibility (use with ColumnPicker) */
  columnVisibility?: VisibilityState
  onColumnVisibilityChange?: (next: VisibilityState) => void
  /** Optional mobile card renderer. When provided, screens < md render a
   *  stack of cards instead of the (wide) table. Pagination still applies. */
  mobileCard?: (row: TData) => React.ReactNode
}

export function DataTable<TData, TValue>({
  columns,
  data,
  stickyRightColumns = [],
  columnVisibility,
  onColumnVisibilityChange,
  mobileCard,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    state: columnVisibility ? { columnVisibility } : undefined,
    onColumnVisibilityChange: onColumnVisibilityChange as any,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10, pageIndex: 0 } },
  })

  // Sync external visibility into table
  useEffect(() => {
    if (columnVisibility) {
      table.setColumnVisibility(columnVisibility)
    }
  }, [columnVisibility, table])

  const headerCell = (header: any) => {
    const isSticky = stickyRightColumns.includes(header.column.id)
    return (
      <TableHead
        key={header.id}
        className={isSticky
          ? "sticky right-0 bg-muted border-l shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] z-10"
          : ""
        }
      >
        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
      </TableHead>
    )
  }

  const bodyCell = (cell: any) => {
    const isSticky = stickyRightColumns.includes(cell.column.id)
    return (
      <TableCell
        key={cell.id}
        className={isSticky
          ? "sticky right-0 bg-card border-l shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] z-10 group-hover:bg-muted/30 transition-colors"
          : ""
        }
      >
        {flexRender(cell.column.columnDef.cell, cell.getContext())}
      </TableCell>
    )
  }

  return (
    <div className="flex flex-col">
      {/* Mobile card view (only when a renderer is supplied) */}
      {mobileCard && (
        <div className="md:hidden flex flex-col gap-2 p-2">
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <div key={row.id}>{mobileCard(row.original as TData)}</div>
            ))
          ) : (
            <div className="h-24 flex items-center justify-center text-sm text-muted-foreground">
              No results found.
            </div>
          )}
        </div>
      )}

      {/* Table view — hidden on mobile when a card renderer exists */}
      <div className={mobileCard ? "hidden md:block" : ""}>
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
                <TableRow key={row.id} className="group">
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
      </div>

      {data.length > 0 && table.getPageCount() >= 1 && (
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
