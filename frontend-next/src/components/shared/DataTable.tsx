'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export interface Column<T> {
  key: keyof T
  label: string
  format?: (v: T[keyof T], row: T) => string | React.ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  maxRows?: number
}

import React from 'react'

export default function DataTable<T extends object>({
  columns,
  data,
  maxRows,
}: DataTableProps<T>) {
  const rows = maxRows ? data.slice(0, maxRows) : data

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map(col => (
              <TableHead key={String(col.key)} className="whitespace-nowrap text-xs font-semibold">
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-8">
                No data
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, i) => (
              <TableRow key={i}>
                {columns.map(col => (
                  <TableCell key={String(col.key)} className="text-sm whitespace-nowrap">
                    {col.format
                      ? col.format(row[col.key], row)
                      : String(row[col.key] ?? '')}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
