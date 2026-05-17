'use client'

import { useState, useEffect } from 'react'
import { getMatches, getProjects, getUsers, getDirectors, getKols } from '@/lib/api/client'
import type { Match, ProjectWithCompany, User, DirectorProfile, KolProfile } from '@/lib/data/types'
import PageHeader from '@/components/layout/PageHeader'
import MetricCard from '@/components/shared/MetricCard'
import BarChart from '@/components/charts/BarChart'
import FunnelChart from '@/components/charts/FunnelChart'
import ScatterChart from '@/components/charts/ScatterChart'
import DataTable from '@/components/shared/DataTable'
import type { Column } from '@/components/shared/DataTable'
import FilterBar from '@/components/shared/FilterBar'
import type { FilterConfig } from '@/components/shared/FilterBar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatUSD, formatPct } from '@/lib/utils/formatters'

interface MatchRow extends Match {
  talent_name: string
  project_title: string
  project_type: string
  talent_type: string
}

export default function MatchingPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [projects, setProjects] = useState<ProjectWithCompany[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [directors, setDirectors] = useState<DirectorProfile[]>([])
  const [kols, setKols] = useState<KolProfile[]>([])
  const [filters, setFilters] = useState<Record<string, string>>({})

  useEffect(() => {
    Promise.all([
      getMatches(),
      getProjects(),
      getUsers(),
      getDirectors(),
      getKols(),
    ]).then(([m, p, u, d, k]) => {
      setMatches(m)
      setProjects(p)
      setUsers(u)
      setDirectors(d)
      setKols(k)
    }).catch(console.error)
  }, [])

  // Build lookup maps
  const projectMap = new Map(projects.map(p => [p.project_id, p]))
  const directorUserMap = new Map(directors.map(d => [d.user_id, { name: d.full_name, type: 'director' }]))
  const kolUserMap = new Map(kols.map(k => [k.user_id, { name: k.stage_name, type: 'kol' }]))

  const enrichedMatches: MatchRow[] = matches.map(m => {
    const project = projectMap.get(m.project_id)
    const dirInfo = directorUserMap.get(m.talent_user_id)
    const kolInfo = kolUserMap.get(m.talent_user_id)
    const talentInfo = dirInfo ?? kolInfo
    return {
      ...m,
      talent_name: talentInfo?.name ?? `User ${m.talent_user_id}`,
      project_title: project?.title ?? `Project ${m.project_id}`,
      project_type: project?.project_type ?? '',
      talent_type: talentInfo?.type ?? 'unknown',
    }
  })

  const uniqueInitiatedBy = [...new Set(matches.map(m => m.initiated_by).filter(Boolean))]
  const uniqueStatuses = [...new Set(matches.map(m => m.status).filter(Boolean))]
  const uniqueTalentTypes = [...new Set(enrichedMatches.map(m => m.talent_type).filter(Boolean))]
  const uniqueProjectTypes = [...new Set(enrichedMatches.map(m => m.project_type).filter(Boolean))]

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
      key: 'talent_type',
      label: 'Talent Type',
      options: uniqueTalentTypes.map(v => ({ label: v, value: v })),
    },
    {
      key: 'project_type',
      label: 'Project Type',
      options: uniqueProjectTypes.map(v => ({ label: v, value: v })),
    },
  ]

  const filtered = enrichedMatches.filter(m => {
    if (filters.initiated_by && filters.initiated_by !== 'all' && m.initiated_by !== filters.initiated_by) return false
    if (filters.status && filters.status !== 'all' && m.status !== filters.status) return false
    if (filters.talent_type && filters.talent_type !== 'all' && m.talent_type !== filters.talent_type) return false
    if (filters.project_type && filters.project_type !== 'all' && m.project_type !== filters.project_type) return false
    return true
  })

  const totalMatches = filtered.length
  const hiredCount = filtered.filter(m => m.status === 'hired' || m.status === 'completed').length
  const hireRate = totalMatches > 0 ? (hiredCount / totalMatches) * 100 : 0
  const avgScore =
    filtered.length > 0
      ? filtered.reduce((s, m) => s + (m.match_score ?? 0), 0) / filtered.length
      : 0
  const avgFee =
    filtered.length > 0
      ? filtered.reduce((s, m) => s + (m.proposed_fee ?? 0), 0) / filtered.length
      : 0

  // Funnel by status order
  const STATUS_ORDER = ['pending', 'shortlisted', 'interview', 'hired', 'completed', 'rejected']
  const statusCounts: Record<string, number> = {}
  for (const m of filtered) {
    statusCounts[m.status ?? 'unknown'] = (statusCounts[m.status ?? 'unknown'] ?? 0) + 1
  }
  const funnelData = STATUS_ORDER
    .filter(s => statusCounts[s])
    .map(s => ({ stage: s, count: statusCounts[s] }))

  // Source comparison
  const sourceMap: Record<string, Record<string, number>> = {}
  for (const m of filtered) {
    const src = m.initiated_by ?? 'unknown'
    const st = m.status ?? 'unknown'
    if (!sourceMap[src]) sourceMap[src] = {}
    sourceMap[src][st] = (sourceMap[src][st] ?? 0) + 1
  }
  const sourceData = Object.entries(sourceMap).map(([source, counts]) => ({
    source,
    hired: counts['hired'] ?? 0,
    rejected: counts['rejected'] ?? 0,
    pending: counts['pending'] ?? 0,
  }))

  // Score distribution histogram
  const scoreBuckets: Record<string, number> = {}
  for (const m of filtered) {
    const bucket = `${Math.floor((m.match_score ?? 0) / 10) * 10}-${Math.floor((m.match_score ?? 0) / 10) * 10 + 9}`
    scoreBuckets[bucket] = (scoreBuckets[bucket] ?? 0) + 1
  }
  const scoreHistData = Object.entries(scoreBuckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([range, count]) => ({ range, count }))

  // Fee vs Score scatter
  const feeScoreData = filtered.map(m => ({
    x: m.proposed_fee ?? 0,
    y: m.match_score ?? 0,
    type: m.talent_type,
  }))

  const columns: Column<MatchRow>[] = [
    { key: 'talent_name', label: 'Talent' },
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
      <PageHeader title="Matching" description="Match applications and performance metrics" />

      <div className="flex gap-6">
        <div className="w-48 shrink-0">
          <FilterBar
            filters={filterConfigs}
            values={filters}
            onChange={(key, val) => setFilters(prev => ({ ...prev, [key]: val }))}
            onReset={() => setFilters({})}
          />
        </div>

        <div className="flex-1 flex flex-col gap-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Total Matches" value={totalMatches} />
            <MetricCard label="Hire Rate" value={formatPct(hireRate)} />
            <MetricCard label="Avg Match Score" value={avgScore.toFixed(1)} />
            <MetricCard label="Avg Proposed Fee" value={formatUSD(avgFee)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Match Status Funnel</CardTitle>
              </CardHeader>
              <CardContent>
                <FunnelChart data={funnelData} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Source Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart
                  data={sourceData as Record<string, unknown>[]}
                  xKey="source"
                  bars={[
                    { key: 'hired', label: 'Hired' },
                    { key: 'pending', label: 'Pending' },
                    { key: 'rejected', label: 'Rejected' },
                  ]}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Score Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart
                  data={scoreHistData as Record<string, unknown>[]}
                  xKey="range"
                  bars={[{ key: 'count', label: 'Matches' }]}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Proposed Fee vs Match Score</CardTitle>
              </CardHeader>
              <CardContent>
                <ScatterChart
                  data={feeScoreData as Record<string, unknown>[]}
                  xKey="x"
                  yKey="y"
                  colorKey="type"
                  xLabel="Proposed Fee (USD)"
                  yLabel="Match Score"
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">All Matches</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable columns={columns} data={filtered} maxRows={50} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
