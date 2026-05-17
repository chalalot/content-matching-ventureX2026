'use client'

import { useState, useEffect } from 'react'
import { getRoi } from '@/lib/api/client'
import type { RoiRow } from '@/lib/data/types'
import PageHeader from '@/components/layout/PageHeader'
import MetricCard from '@/components/shared/MetricCard'
import BarChart from '@/components/charts/BarChart'
import ScatterChart from '@/components/charts/ScatterChart'
import DataTable from '@/components/shared/DataTable'
import type { Column } from '@/components/shared/DataTable'
import FilterBar from '@/components/shared/FilterBar'
import type { FilterConfig } from '@/components/shared/FilterBar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatPct } from '@/lib/utils/formatters'

function median(arr: number[]): number {
  if (!arr.length) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

export default function ROIPage() {
  const [rows, setRows] = useState<RoiRow[]>([])
  const [filters, setFilters] = useState<Record<string, string>>({})

  useEffect(() => {
    getRoi().then(setRows).catch(console.error)
  }, [])

  const uniqueTalentTypes = [...new Set(rows.map(r => r.talent_type).filter(Boolean))]
  const uniqueProjectTypes = [...new Set(rows.map(r => r.project_type).filter(Boolean))]
  const uniqueInitiatedBy = [...new Set(rows.map(r => r.initiated_by).filter(Boolean))]
  const uniqueStatuses = [...new Set(rows.map(r => r.status).filter(Boolean))]

  const filterConfigs: FilterConfig[] = [
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
  ]

  const filtered = rows.filter(r => {
    if (filters.talent_type && filters.talent_type !== 'all' && r.talent_type !== filters.talent_type) return false
    if (filters.project_type && filters.project_type !== 'all' && r.project_type !== filters.project_type) return false
    if (filters.initiated_by && filters.initiated_by !== 'all' && r.initiated_by !== filters.initiated_by) return false
    if (filters.status && filters.status !== 'all' && r.status !== filters.status) return false
    return true
  })

  const roiValues = filtered.map(r => r.roi_percent ?? 0)
  const avgRoi = roiValues.length > 0 ? roiValues.reduce((s, v) => s + v, 0) / roiValues.length : 0
  const medianRoi = median(roiValues)

  const sortedByRoi = [...filtered].sort((a, b) => (b.roi_percent ?? 0) - (a.roi_percent ?? 0))
  const best = sortedByRoi[0]
  const worst = sortedByRoi[sortedByRoi.length - 1]

  const negativeCount = filtered.filter(r => (r.roi_percent ?? 0) < 0).length
  const extremeCount = filtered.filter(r => Math.abs(r.roi_percent ?? 0) > 500).length

  // ROI by matching type
  const roiByMatchType: Record<string, number[]> = {}
  for (const r of filtered) {
    const key = r.initiated_by ?? 'unknown'
    if (!roiByMatchType[key]) roiByMatchType[key] = []
    roiByMatchType[key].push(r.roi_percent ?? 0)
  }
  const roiByMatchTypeData = Object.entries(roiByMatchType).map(([type, vals]) => ({
    type,
    avg_roi: vals.reduce((s, v) => s + v, 0) / vals.length,
  }))

  // ROI by project type
  const roiByProjectType: Record<string, number[]> = {}
  for (const r of filtered) {
    const key = r.project_type ?? 'unknown'
    if (!roiByProjectType[key]) roiByProjectType[key] = []
    roiByProjectType[key].push(r.roi_percent ?? 0)
  }
  const roiByProjectTypeData = Object.entries(roiByProjectType).map(([type, vals]) => ({
    type,
    avg_roi: vals.reduce((s, v) => s + v, 0) / vals.length,
  }))

  // ROI by talent type
  const roiByTalentType: Record<string, number[]> = {}
  for (const r of filtered) {
    const key = r.talent_type ?? 'unknown'
    if (!roiByTalentType[key]) roiByTalentType[key] = []
    roiByTalentType[key].push(r.roi_percent ?? 0)
  }
  const roiByTalentTypeData = Object.entries(roiByTalentType).map(([type, vals]) => ({
    type,
    avg_roi: vals.reduce((s, v) => s + v, 0) / vals.length,
    count: vals.length,
    median_roi: median(vals),
  }))

  // Scatter: fee vs ROI (size = match score)
  const feeRoiData = filtered.map(r => ({
    x: r.proposed_fee ?? 0,
    y: r.roi_percent ?? 0,
    z: (r.match_score ?? 0) * 3,
    name: r.talent_name,
  }))

  // Scatter: quality vs ROI
  const qualityRoiData = filtered.map(r => ({
    x: r.quality_score ?? 0,
    y: r.roi_percent ?? 0,
    type: r.talent_type ?? 'unknown',
    name: r.talent_name,
  }))

  const top10 = sortedByRoi.slice(0, 10)
  const bottom10 = sortedByRoi.slice(-10).reverse()

  const roiColumns: Column<RoiRow>[] = [
    { key: 'talent_name', label: 'Talent' },
    { key: 'company_name', label: 'Company' },
    { key: 'title', label: 'Project' },
    { key: 'talent_type', label: 'Type' },
    { key: 'match_score', label: 'Score', format: v => (v as number)?.toFixed(1) ?? '-' },
    { key: 'roi_percent', label: 'ROI %', format: v => formatPct(v as number) },
    { key: 'cost_efficiency_score', label: 'Cost Eff.', format: v => (v as number)?.toFixed(2) ?? '-' },
  ]

  return (
    <div>
      <PageHeader title="ROI Analysis" description="Return on investment estimates (simulated for POC)" />

      {/* Info callout */}
      <Card className="mb-6 border-border bg-muted/40">
        <CardContent className="py-3">
          <p className="text-sm text-muted-foreground">
            ROI estimates are simulated for proof-of-concept purposes. Values are based on follower reach, engagement rates, and estimated conversion models.
          </p>
        </CardContent>
      </Card>

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
            <MetricCard label="Avg ROI" value={formatPct(avgRoi)} />
            <MetricCard label="Median ROI" value={formatPct(medianRoi)} />
            <MetricCard
              label="Best ROI"
              value={formatPct(best?.roi_percent)}
              sub={best?.talent_name}
            />
            <MetricCard
              label="Worst ROI"
              value={formatPct(worst?.roi_percent)}
              sub={worst?.talent_name}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Avg ROI by Matching Type</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart
                  data={roiByMatchTypeData as Record<string, unknown>[]}
                  xKey="type"
                  bars={[{ key: 'avg_roi', label: 'Avg ROI %' }]}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Avg ROI by Project Type</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart
                  data={roiByProjectTypeData as Record<string, unknown>[]}
                  xKey="type"
                  bars={[{ key: 'avg_roi', label: 'Avg ROI %' }]}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">ROI by Talent Type</CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart
                data={roiByTalentTypeData as Record<string, unknown>[]}
                xKey="type"
                bars={[{ key: 'avg_roi', label: 'Avg ROI %' }]}
                horizontal
              />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                {roiByTalentTypeData.map(d => (
                  <div key={d.type} className="text-center p-2 border rounded">
                    <p className="text-xs text-muted-foreground">{d.type}</p>
                    <p className="font-semibold text-sm">Median: {formatPct(d.median_roi)}</p>
                    <p className="text-xs text-muted-foreground">{d.count} matches</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Cost Efficiency (Fee vs ROI)</CardTitle>
              </CardHeader>
              <CardContent>
                <ScatterChart
                  data={feeRoiData as Record<string, unknown>[]}
                  xKey="x"
                  yKey="y"
                  sizeKey="z"
                  xLabel="Proposed Fee (USD)"
                  yLabel="ROI %"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quality Score vs ROI</CardTitle>
              </CardHeader>
              <CardContent>
                <ScatterChart
                  data={qualityRoiData as Record<string, unknown>[]}
                  xKey="x"
                  yKey="y"
                  colorKey="type"
                  xLabel="Quality Score"
                  yLabel="ROI %"
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Top 10 ROI</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable columns={roiColumns} data={top10} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Bottom 10 ROI</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable columns={roiColumns} data={bottom10} />
              </CardContent>
            </Card>
          </div>

          {negativeCount > 0 && (
            <Card className="border-black bg-muted/40">
              <CardContent className="py-3">
                <p className="text-sm font-medium">
                  Warning: {negativeCount} match{negativeCount > 1 ? 'es have' : ' has'} negative ROI — review cost structure for these campaigns.
                </p>
              </CardContent>
            </Card>
          )}

          {extremeCount > 0 && (
            <Card className="border-border bg-muted/40">
              <CardContent className="py-3">
                <p className="text-sm text-muted-foreground">
                  Note: {extremeCount} match{extremeCount > 1 ? 'es have' : ' has'} extreme ROI (&gt;500%) — these may be outliers or model artifacts.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
