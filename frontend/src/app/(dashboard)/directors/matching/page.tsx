'use client'

import { useState, useEffect } from 'react'
import { getMatches, getProjects, getDirectors } from '@/lib/api/client'
import type { Match, ProjectWithCompany, DirectorProfile } from '@/lib/data/types'
import PageHeader from '@/components/layout/PageHeader'
import MetricCard from '@/components/shared/MetricCard'
import BarChart from '@/components/charts/BarChart'
import FunnelChart from '@/components/charts/FunnelChart'
import ScatterChart from '@/components/charts/ScatterChart'
import DataTable from '@/components/shared/DataTable'
import type { Column } from '@/components/shared/DataTable'
import FilterBar from '@/components/shared/FilterBar'
import type { FilterConfig } from '@/components/shared/FilterBar'
import { ChartSkeleton, TableSkeleton } from '@/components/shared/PageSkeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatUSD, formatPct } from '@/lib/utils/formatters'
import { getStatusColor } from '@/lib/utils/chart-colors'
import { isStatus } from '@/lib/data/status'

interface MatchRow extends Match {
  talent_name: string
  project_title: string
  project_type: string
}

export default function DirectorMatchingPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [projects, setProjects] = useState<ProjectWithCompany[]>([])
  const [directors, setDirectors] = useState<DirectorProfile[]>([])
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    Promise.all([getMatches(), getProjects(), getDirectors()])
      .then(([m, p, d]) => {
        setMatches(m)
        setProjects(p)
        setDirectors(d)
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  const projectMap = new Map(projects.map(p => [p.project_id, p]))
  const directorUserMap = new Map(directors.map(d => [d.user_id, d.full_name]))

  // Only show matches that belong to a known director
  const directorMatches: MatchRow[] = matches
    .filter(m => directorUserMap.has(m.talent_user_id))
    .map(m => {
      const project = projectMap.get(m.project_id)
      return {
        ...m,
        talent_name: directorUserMap.get(m.talent_user_id) ?? `User ${m.talent_user_id}`,
        project_title: project?.title ?? `Project ${m.project_id}`,
        project_type: project?.project_type ?? '',
      }
    })

  const uniqueInitiatedBy = [...new Set(directorMatches.map(m => m.initiated_by).filter(Boolean))]
  const uniqueStatuses = [...new Set(directorMatches.map(m => m.status).filter(Boolean))]
  const uniqueProjectTypes = [...new Set(directorMatches.map(m => m.project_type).filter(Boolean))]

  const filterConfigs: FilterConfig[] = [
    {
      key: 'initiated_by',
      label: 'Initiated By',
      options: uniqueInitiatedBy.map(v => ({ label: v, value: v })),
    },
    {
      key: 'status',
      label: 'Match Status',
      options: uniqueStatuses.map(v => ({ label: v, value: v })),
    },
    {
      key: 'project_type',
      label: 'Project Type',
      options: uniqueProjectTypes.map(v => ({ label: v, value: v })),
    },
  ]

  const filtered = directorMatches.filter(m => {
    if (filters.initiated_by && filters.initiated_by !== 'all' && m.initiated_by !== filters.initiated_by) return false
    if (filters.status && filters.status !== 'all' && m.status !== filters.status) return false
    if (filters.project_type && filters.project_type !== 'all' && m.project_type !== filters.project_type) return false
    return true
  })

  const totalMatches = filtered.length
  const hiredCount = filtered.filter(m => isStatus(m.status, 'hired') || isStatus(m.status, 'completed')).length
  const hireRate = totalMatches > 0 ? (hiredCount / totalMatches) * 100 : 0
  const avgScore = filtered.length > 0 ? filtered.reduce((s, m) => s + (m.match_score ?? 0), 0) / filtered.length : 0
  const avgFee = filtered.length > 0 ? filtered.reduce((s, m) => s + (m.proposed_fee ?? 0), 0) / filtered.length : 0

  const STATUS_ORDER = ['pitching', 'shortlisted', 'interview', 'hired', 'completed', 'rejected', 'pending']
  const statusCounts: Record<string, number> = {}
  for (const m of filtered) {
    const status = String(m.status ?? 'unknown').toLowerCase()
    statusCounts[status] = (statusCounts[status] ?? 0) + 1
  }
  const funnelData = STATUS_ORDER.filter(s => statusCounts[s]).map(s => ({ stage: s, count: statusCounts[s] }))

  const sourceMap: Record<string, Record<string, number>> = {}
  for (const m of filtered) {
    const src = m.initiated_by ?? 'unknown'
    const st = String(m.status ?? 'unknown').toLowerCase()
    if (!sourceMap[src]) sourceMap[src] = {}
    sourceMap[src][st] = (sourceMap[src][st] ?? 0) + 1
  }
  const sourceData = Object.entries(sourceMap).map(([source, counts]) => ({
    source,
    hired: counts['hired'] ?? 0,
    rejected: counts['rejected'] ?? 0,
    pending: counts['pending'] ?? 0,
  }))

  const scoreBuckets: Record<string, number> = {}
  for (const m of filtered) {
    const bucket = `${Math.floor((m.match_score ?? 0) / 10) * 10}-${Math.floor((m.match_score ?? 0) / 10) * 10 + 9}`
    scoreBuckets[bucket] = (scoreBuckets[bucket] ?? 0) + 1
  }
  const scoreHistData = Object.entries(scoreBuckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([range, count]) => ({ range, count }))

  const feeScoreData = filtered.map(m => ({ x: m.proposed_fee ?? 0, y: m.match_score ?? 0 }))

  const columns: Column<MatchRow>[] = [
    { key: 'talent_name', label: 'Director' },
    { key: 'project_title', label: 'Project' },
    { key: 'project_type', label: 'Type' },
    { key: 'initiated_by', label: 'Initiated By' },
    { key: 'match_score', label: 'Score', format: v => (v as number)?.toFixed(1) ?? '-' },
    { key: 'proposed_fee', label: 'Proposed Fee', format: v => formatUSD(v as number) },
    { key: 'status', label: 'Status' },
    { key: 'created_at', label: 'Date', format: v => String(v ?? '').slice(0, 10) },
  ]

  return (
    <div>
      <PageHeader title="Director Matching" description="Match applications and performance metrics for directors" />

      <div className="flex flex-col">
        <FilterBar
          filters={filterConfigs}
          values={filters}
          onChange={(key, val) => setFilters(prev => ({ ...prev, [key]: val }))}
          onReset={() => setFilters({})}
        />

        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Total Matches" value={totalMatches} loading={isLoading} />
            <MetricCard label="Hire Rate" value={formatPct(hireRate)} loading={isLoading} />
            <MetricCard label="Avg Match Score" value={avgScore.toFixed(1)} loading={isLoading} />
            <MetricCard label="Avg Proposed Fee" value={formatUSD(avgFee)} loading={isLoading} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Match Status Funnel</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <ChartSkeleton />
                ) : (
                  <FunnelChart data={funnelData} colors={funnelData.map(d => getStatusColor(d.stage))} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Source Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <ChartSkeleton />
                ) : (
                  <BarChart
                    data={sourceData as Record<string, unknown>[]}
                    xKey="source"
                    bars={[
                      { key: 'hired', label: 'Hired' },
                      { key: 'pending', label: 'Pending' },
                      { key: 'rejected', label: 'Rejected' },
                    ]}
                    colors={[getStatusColor('hired'), getStatusColor('pending'), getStatusColor('rejected')]}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Score Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <ChartSkeleton />
                ) : (
                  <BarChart
                    data={scoreHistData as Record<string, unknown>[]}
                    xKey="range"
                    bars={[{ key: 'count', label: 'Matches' }]}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Proposed Fee vs Match Score</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <ChartSkeleton />
                ) : (
                  <ScatterChart
                    data={feeScoreData as Record<string, unknown>[]}
                    xKey="x"
                    yKey="y"
                    xLabel="Proposed Fee (USD)"
                    yLabel="Match Score"
                  />
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">All Director Matches</CardTitle>
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
