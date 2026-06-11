'use client'

import { useState, useEffect } from 'react'
import { getKols, getSocialMetrics } from '@/lib/api/client'
import type { KolProfile, SocialMetric } from '@/lib/data/types'
import PageHeader from '@/components/layout/PageHeader'
import MetricCard from '@/components/shared/MetricCard'
import BarChart from '@/components/charts/BarChart'
import PieChart from '@/components/charts/PieChart'
import ScatterChart from '@/components/charts/ScatterChart'
import DataTable from '@/components/shared/DataTable'
import type { Column } from '@/components/shared/DataTable'
import { ChartSkeleton, TableSkeleton } from '@/components/shared/PageSkeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatUSD, formatNumber, formatPct } from '@/lib/utils/formatters'

export default function KolsPage() {
  const [kols, setKols] = useState<KolProfile[]>([])
  const [metrics, setMetrics] = useState<SocialMetric[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    Promise.all([getKols(), getSocialMetrics()])
      .then(([k, m]) => {
        setKols(k)
        setMetrics(m)
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  const totalFollowers = metrics.reduce((s, m) => s + (m.follower_count ?? 0), 0)
  const avgFollowers = metrics.length > 0 ? totalFollowers / metrics.length : 0
  const avgEngagement =
    metrics.length > 0 ? metrics.reduce((s, m) => s + (m.avg_engagement_rate ?? 0), 0) / metrics.length : 0
  const avgBookingFee =
    kols.length > 0 ? kols.reduce((s, k) => s + (k.booking_fee_estimate ?? 0), 0) / kols.length : 0

  const metricsByKol: Record<string, { followers: number; engagement: number }> = {}
  for (const m of metrics) {
    if (!metricsByKol[m.kol_id]) metricsByKol[m.kol_id] = { followers: 0, engagement: 0 }
    metricsByKol[m.kol_id].followers += m.follower_count ?? 0
    metricsByKol[m.kol_id].engagement = (metricsByKol[m.kol_id].engagement + (m.avg_engagement_rate ?? 0)) / 2
  }

  const scatterData = kols.map(k => ({
    x: metricsByKol[k.kol_id]?.followers ?? 0,
    y: metricsByKol[k.kol_id]?.engagement ?? 0,
    niche: k.main_niche ?? 'Other',
    name: k.stage_name,
  }))

  const platformCounts: Record<string, number> = {}
  for (const m of metrics) {
    platformCounts[m.platform ?? 'Other'] = (platformCounts[m.platform ?? 'Other'] ?? 0) + 1
  }
  const platformData = Object.entries(platformCounts).map(([platform, count]) => ({ platform, count }))

  const nicheCounts: Record<string, number> = {}
  for (const k of kols) {
    nicheCounts[k.main_niche ?? 'Other'] = (nicheCounts[k.main_niche ?? 'Other'] ?? 0) + 1
  }
  const nichePieData = Object.entries(nicheCounts).map(([name, value]) => ({ name, value }))

  const columns: Column<KolProfile>[] = [
    { key: 'stage_name', label: 'Stage Name' },
    { key: 'main_niche', label: 'Niche' },
    { key: 'target_demographic_age', label: 'Target Demo' },
    { key: 'booking_fee_estimate', label: 'Booking Fee', format: v => formatUSD(v as number) },
  ]

  return (
    <div>
      <PageHeader title="KOLs" description="Key opinion leader talent pool and social metrics" />

      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Total KOLs" value={kols.length} loading={isLoading} />
          <MetricCard label="Avg Followers" value={formatNumber(avgFollowers)} loading={isLoading} />
          <MetricCard label="Avg Engagement" value={formatPct(avgEngagement)} loading={isLoading} />
          <MetricCard label="Avg Booking Fee" value={formatUSD(avgBookingFee)} loading={isLoading} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Followers vs Engagement Rate (by Niche)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartSkeleton tall />
            ) : (
              <ScatterChart
                data={scatterData as Record<string, unknown>[]}
                xKey="x"
                yKey="y"
                colorKey="niche"
                xLabel="Total Followers"
                yLabel="Avg Engagement %"
              />
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">KOL Accounts by Platform</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <ChartSkeleton />
              ) : (
                <BarChart
                  data={platformData as Record<string, unknown>[]}
                  xKey="platform"
                  bars={[{ key: 'count', label: 'Accounts' }]}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">KOLs by Niche</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <ChartSkeleton /> : <PieChart data={nichePieData} donut />}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">KOL Profiles</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <TableSkeleton /> : <DataTable columns={columns} data={kols} maxRows={50} />}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
