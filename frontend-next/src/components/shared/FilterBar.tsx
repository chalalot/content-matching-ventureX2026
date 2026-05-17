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
  return (
    <div className="flex flex-col gap-4 min-w-[180px]">
      <h3 className="text-sm font-semibold uppercase tracking-wide">Filters</h3>
      {filters.map(filter => (
        <div key={filter.key} className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">{filter.label}</label>
          <Select
            value={values[filter.key] ?? 'all'}
            onValueChange={val => onChange(filter.key, val)}
          >
            <SelectTrigger className="h-8 text-xs">
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
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={onReset}
        className="mt-2 text-xs"
      >
        Reset Filters
      </Button>
    </div>
  )
}
