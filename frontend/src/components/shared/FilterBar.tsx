'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'

export interface FilterOption {
  label: string
  value: string
}

export interface FilterConfig {
  key: string
  label: string
  options: FilterOption[]
}

interface FilterBarProps {
  filters: FilterConfig[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  onReset: () => void
}

export default function FilterBar({ filters, values, onChange, onReset }: FilterBarProps) {
  const hasActiveFilter = filters.some(f => values[f.key] && values[f.key] !== 'all')

  return (
    <div className="flex flex-wrap items-center gap-2 py-3 border-b border-border mb-6">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mr-1">
        Filters
      </span>
      {filters.map(filter => (
        <Select
          key={filter.key}
          value={values[filter.key] ?? 'all'}
          onValueChange={val => onChange(filter.key, val ?? 'all')}
        >
          <SelectTrigger className="h-7 text-xs w-auto min-w-[110px] max-w-[160px]">
            <span className="text-muted-foreground mr-1">{filter.label}:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {filter.options.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
      {hasActiveFilter && (
        <Button variant="ghost" size="sm" onClick={onReset} className="h-7 text-xs px-2">
          Reset
        </Button>
      )}
    </div>
  )
}
