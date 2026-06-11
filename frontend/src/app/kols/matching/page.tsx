'use client'

import { useState, useEffect } from 'react'
import { getMatches, getProjects, getKols, getSocialMetrics } from '@/lib/api/client'
import type { Match, ProjectWithCompany, KolProfile, SocialMetric } from '@/lib/data/types'
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
import { formatUSD, formatNumber, formatPct } from '@/lib/utils/formatters'
import { getStatusColor } from '@/lib/utils/chart-colors'
import { isStatus } from '@/lib/data/status'

interface KolMatchRow extends Match {
  talent_name: string
  main_niche: string
  project_title: string
  project_type: string
  total_followers: number
}

export default function KolMatchingPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [projects, setProjects] = useState<ProjectWithCompany[]>([])
  const [kols, setKols] = useState<KolProfile[]>([])
  const [socialMetrics, setSocialMetrics] = useState<SocialMetric[]>([])
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    Promise.all([getMatches(), getProjects(), getKols(), getSocialMetrics()])
      .then(([m, p, k, s]) => {
        setMatches(m)
        setProjects(p)
        setKols(k)
        setSocialMetrics(s)
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  const projectMap = new Map(projects.map(p => [p.project_id, p]))
  const kolUserMap = new Map(kols.map(k => [k.user_id, k]))

  // Aggregate followers per kol_id
  const followersByKol: Record<string, number> = {}
  for (const m of socialMetrics) {
    followersByKol[m.kol_id] = (followersByKol[m.kol_id] ?? 0) + (m.follower_count ?? 0)
  }

  // Only show matches that belong to a known KOL
  const kolMatches: KolMatchRow[] = matches
    .filter(m => kolUserMap.has(m.talent_user_id))
    .map(m => {
      const kol = kolUserMap.get(m.talent_user_id)!
      const project = projectMap.get(m.project_id)
      return {
        ...m,
        talent_name: kol.stage_name ?? `User ${m.talent_user_id}`,
        main_niche: kol.main_niche ?? '',
        project_title: project?.title ?? `Project ${m.project_id}`,
        project_type: project?.project_type ?? '',
        total_followers: followersByKol[kol.kol_id] ?? 0,
      }
    })

  const uniqueInitiatedBy = [...new Set(kolMatches.map(m => m.initiated_by).filter(Boolean))]
  const uniqueStatuses = [...new Set(kolMatches.map(m => m.status).filter(Boolean))]
  const uniqueNiches = [...new Set(kolMatches.map(m => m.main_niche).filter(Boolean))]
  const uniqueProjectTypes = [...new Set(kolMatches.map(m => m.project_type).filter(Boolean))]

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
      key: 'main_niche',
      label: 'Niche',
      options: uniqueNiches.map(v => ({ label: v, value: v })),
    },
    {
      key: 'project_type',
      label: 'Project Type',
      options: uniqueProjectTypes.map(v => ({ label: v, value: v })),
    },
  ]

  const filtered = kolMatches.filter(m => {
    if (filters.initiated_by && filters.initiated_by !== 'all' && m.initiated_by !== filters.initiated_by) return false
    if (filters.status && filters.status !== 'all' && m.status !== filters.status) return false
    if (filters.main_niche && filters.main_niche !== 'all' && m.main_niche !== filters.main_niche) return false
    if (filters.project_type && filters.project_type !== 'all' && m.project_type !== filters.project_type) return false
    return true
  })

  const totalMatches = filtered.length
  const hiredCount = filtered.filter(m => isStatus(m.status, 'hired') || isStatus(m.status, 'completed')).length
  const hireRate = totalMatches > 0 ? (hiredCount / totalMatches) * 100 : 0
  const avgScore = filtered.length > 0 ? filtered.reduce((s, m) => s + (m.match_score ?? 0), 0) / filtered.length : 0
  const avgFollowers =
    filtered.length > 0 ? filtered.reduce((s, m) => s + m.total_followers, 0) / filtered.length : 0

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

  // Followers vs match score scatter
  const followersScoreData = filtered.map(m => ({
    x: m.total_followers,
    y: m.match_score ?? 0,
    niche: m.main_niche,
  }))

  // Niche breakdown bar
  const nicheCounts: Record<string, number> = {}
  for (const m of filtered) {
    nicheCounts[m.main_niche || 'Unknown'] = (nicheCounts[m.main_niche || 'Unknown'] ?? 0) + 1
  }
  const nicheData = Object.entries(nicheCounts).map(([niche, count]) => ({ niche, count }))

  const columns: Column<KolMatchRow>[] = [
    { key: 'talent_name', label: 'KOL' },
    { key: 'main_niche', label: 'Niche' },
    { key: 'project_title', label: 'Project' },
    { key: 'initiated_by', label: 'Initiated By' },
    { key: 'total_followers', label: 'Followers', format: v => formatNumber(v as number) },
    { key: 'match_score', label: 'Score', format: v => (v as number)?.toFixed(1) ?? '-' },
    { key: 'proposed_fee', label: 'Booking Fee', format: v => formatUSD(v as number) },
    { key: 'status', label: 'Status' },
    { key: 'created_at', label: 'Date', format: v => String(v ?? '').slice(0, 10) },
  ]

  return (
    <div>
      <PageHeader title="KOL Matching" description="Match applications and performance metrics for KOLs" />

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
            <MetricCard label="Avg Followers" value={formatNumber(avgFollowers)} loading={isLoading} />
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
                <CardTitle className="text-sm">Followers vs Match Score (by Niche)</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <ChartSkeleton />
                ) : (
                  <ScatterChart
                    data={followersScoreData as Record<string, unknown>[]}
                    xKey="x"
                    yKey="y"
                    colorKey="niche"
                    xLabel="Total Followers"
                    yLabel="Match Score"
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Matches by Niche</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <ChartSkeleton />
                ) : (
                  <BarChart
                    data={nicheData as Record<string, unknown>[]}
                    xKey="niche"
                    bars={[{ key: 'count', label: 'Matches' }]}
                    horizontal
                  />
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">All KOL Matches</CardTitle>
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
