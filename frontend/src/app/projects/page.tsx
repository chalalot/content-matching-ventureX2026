'use client'

import { useState, useEffect } from 'react'
import { getProjects } from '@/lib/api/client'
import type { ProjectWithCompany } from '@/lib/data/types'
import PageHeader from '@/components/layout/PageHeader'
import MetricCard from '@/components/shared/MetricCard'
import BarChart from '@/components/charts/BarChart'
import DataTable from '@/components/shared/DataTable'
import type { Column } from '@/components/shared/DataTable'
import FilterBar from '@/components/shared/FilterBar'
import type { FilterConfig } from '@/components/shared/FilterBar'
import { ChartSkeleton, TableSkeleton } from '@/components/shared/PageSkeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatUSD } from '@/lib/utils/formatters'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectWithCompany[]>([])
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getProjects()
      .then(setProjects)
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  const uniqueTypes = [...new Set(projects.map(p => p.project_type).filter(Boolean))]
  const uniqueStatuses = [...new Set(projects.map(p => p.status).filter(Boolean))]
  const uniqueLocations = [...new Set(projects.map(p => p.shooting_location).filter(Boolean))]

  const filterConfigs: FilterConfig[] = [
    {
      key: 'project_type',
      label: 'Project Type',
      options: uniqueTypes.map(t => ({ label: t, value: t })),
    },
    {
      key: 'status',
      label: 'Status',
      options: uniqueStatuses.map(s => ({ label: s, value: s })),
    },
    {
      key: 'shooting_location',
      label: 'Location',
      options: uniqueLocations.map(l => ({ label: l, value: l })),
    },
  ]

  const filtered = projects.filter(p => {
    if (filters.project_type && filters.project_type !== 'all' && p.project_type !== filters.project_type) return false
    if (filters.status && filters.status !== 'all' && p.status !== filters.status) return false
    if (filters.shooting_location && filters.shooting_location !== 'all' && p.shooting_location !== filters.shooting_location) return false
    return true
  })

  const totalProjects = filtered.length
  const avgBudgetMin = filtered.length > 0 ? filtered.reduce((s, p) => s + (p.budget_min ?? 0), 0) / filtered.length : 0
  const avgBudgetMax = filtered.length > 0 ? filtered.reduce((s, p) => s + (p.budget_max ?? 0), 0) / filtered.length : 0
  const openCount = filtered.filter(p => p.status === 'open').length
  const inProgressCount = filtered.filter(p => p.status === 'in_progress').length

  // Budget by type
  const budgetByType: Record<string, { min_total: number; max_total: number; count: number }> = {}
  for (const p of filtered) {
    const t = p.project_type ?? 'Other'
    if (!budgetByType[t]) budgetByType[t] = { min_total: 0, max_total: 0, count: 0 }
    budgetByType[t].min_total += p.budget_min ?? 0
    budgetByType[t].max_total += p.budget_max ?? 0
    budgetByType[t].count++
  }
  const budgetData = Object.entries(budgetByType).map(([type, v]) => ({
    type,
    avg_min: Math.round(v.min_total / v.count),
    avg_max: Math.round(v.max_total / v.count),
  }))

  // Status funnel
  const statusCounts: Record<string, number> = {}
  for (const p of filtered) {
    statusCounts[p.status ?? 'unknown'] = (statusCounts[p.status ?? 'unknown'] ?? 0) + 1
  }
  const statusData = Object.entries(statusCounts).map(([status, count]) => ({ status, count }))

  // Timeline Gantt (top 15 by start date)
  const ganttData = filtered
    .filter(p => p.timeline_start && p.timeline_end)
    .slice(0, 15)
    .map(p => {
      const start = new Date(p.timeline_start).getTime()
      const end = new Date(p.timeline_end).getTime()
      const durationWeeks = Math.round((end - start) / (7 * 24 * 60 * 60 * 1000))
      return { title: p.title.slice(0, 20), duration: durationWeeks }
    })
    .filter(d => d.duration > 0)

  const columns: Column<ProjectWithCompany>[] = [
    { key: 'title', label: 'Title' },
    { key: 'company_name', label: 'Company' },
    { key: 'project_type', label: 'Type' },
    { key: 'budget_min', label: 'Budget Min', format: v => formatUSD(v as number) },
    { key: 'budget_max', label: 'Budget Max', format: v => formatUSD(v as number) },
    { key: 'status', label: 'Status' },
    { key: 'shooting_location', label: 'Location' },
    { key: 'timeline_start', label: 'Start', format: v => String(v ?? '').slice(0, 10) },
    { key: 'timeline_end', label: 'End', format: v => String(v ?? '').slice(0, 10) },
  ]

  return (
    <div>
      <PageHeader title="Projects" description="Project listings and budget analysis" />

      <div className="flex flex-col">
        <FilterBar
          filters={filterConfigs}
          values={filters}
          onChange={(key, val) => setFilters(prev => ({ ...prev, [key]: val }))}
          onReset={() => setFilters({})}
        />

        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Total Projects" value={totalProjects} loading={isLoading} />
            <MetricCard label="Open" value={openCount} loading={isLoading} />
            <MetricCard label="In Progress" value={inProgressCount} loading={isLoading} />
            <MetricCard
              label="Avg Budget Range"
              value={`${formatUSD(avgBudgetMin)}–${formatUSD(avgBudgetMax)}`}
              loading={isLoading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Avg Budget by Project Type</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <ChartSkeleton />
                ) : (
                  <BarChart
                    data={budgetData as Record<string, unknown>[]}
                    xKey="type"
                    bars={[
                      { key: 'avg_min', label: 'Avg Min' },
                      { key: 'avg_max', label: 'Avg Max' },
                    ]}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Projects by Status</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <ChartSkeleton />
                ) : (
                  <BarChart
                    data={statusData as Record<string, unknown>[]}
                    xKey="status"
                    bars={[{ key: 'count', label: 'Count' }]}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Project Timeline Duration (weeks)</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <ChartSkeleton tall />
              ) : (
                <BarChart
                  data={ganttData as Record<string, unknown>[]}
                  xKey="title"
                  bars={[{ key: 'duration', label: 'Duration (weeks)' }]}
                  horizontal
                  height={Math.max(200, ganttData.length * 30)}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
            <CardTitle className="text-sm">All Projects</CardTitle>
          </CardHeader>
          <CardContent>
              {isLoading ? <TableSkeleton /> : <DataTable columns={columns} data={filtered} maxRows={50} />}
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  )
}
