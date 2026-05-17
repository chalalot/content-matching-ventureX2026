'use client'

import { useState, useEffect } from 'react'
import { getDirectors, getKols, getSocialMetrics, getPortfolios } from '@/lib/api/client'
import type { DirectorProfile, KolProfile, SocialMetric, Portfolio } from '@/lib/data/types'
import PageHeader from '@/components/layout/PageHeader'
import MetricCard from '@/components/shared/MetricCard'
import BarChart from '@/components/charts/BarChart'
import PieChart from '@/components/charts/PieChart'
import ScatterChart from '@/components/charts/ScatterChart'
import DataTable from '@/components/shared/DataTable'
import type { Column } from '@/components/shared/DataTable'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatUSD, formatNumber, formatPct } from '@/lib/utils/formatters'

export default function TalentPage() {
  const [directors, setDirectors] = useState<DirectorProfile[]>([])
  const [kols, setKols] = useState<KolProfile[]>([])
  const [metrics, setMetrics] = useState<SocialMetric[]>([])
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])

  useEffect(() => {
    Promise.all([
      getDirectors(),
      getKols(),
      getSocialMetrics(),
      getPortfolios(),
    ]).then(([d, k, m, p]) => {
      setDirectors(d)
      setKols(k)
      setMetrics(m)
      setPortfolios(p)
    }).catch(console.error)
  }, [])

  // --- Directors ---
  const avgExp = directors.length > 0
    ? directors.reduce((s, d) => s + (d.years_of_experience ?? 0), 0) / directors.length
    : 0
  const avgRate = directors.length > 0
    ? directors.reduce((s, d) => s + (d.base_day_rate ?? 0), 0) / directors.length
    : 0
  const availableCount = directors.filter(d => d.availability_status === 'available').length
  const availabilityPct = directors.length > 0 ? (availableCount / directors.length) * 100 : 0

  const portfolioCountByUser: Record<number, number> = {}
  for (const p of portfolios) {
    portfolioCountByUser[p.user_id] = (portfolioCountByUser[p.user_id] ?? 0) + 1
  }

  const directorScatterData = directors.map(d => ({
    x: d.years_of_experience ?? 0,
    y: d.base_day_rate ?? 0,
    z: (portfolioCountByUser[d.user_id] ?? 0) + 1,
    name: d.full_name,
  }))

  const locationCounts: Record<string, number> = {}
  for (const d of directors) {
    const loc = d.primary_location ?? 'Unknown'
    locationCounts[loc] = (locationCounts[loc] ?? 0) + 1
  }
  const locationData = Object.entries(locationCounts).map(([location, count]) => ({ location, count }))

  const directorColumns: Column<DirectorProfile>[] = [
    { key: 'full_name', label: 'Name' },
    { key: 'years_of_experience', label: 'Experience (yrs)' },
    { key: 'base_day_rate', label: 'Day Rate', format: v => formatUSD(v as number) },
    { key: 'primary_location', label: 'Location' },
    { key: 'availability_status', label: 'Availability' },
  ]

  // --- KOLs ---
  const totalFollowers = metrics.reduce((s, m) => s + (m.follower_count ?? 0), 0)
  const avgFollowers = metrics.length > 0 ? totalFollowers / metrics.length : 0
  const avgEngagement = metrics.length > 0
    ? metrics.reduce((s, m) => s + (m.avg_engagement_rate ?? 0), 0) / metrics.length
    : 0
  const avgBookingFee = kols.length > 0
    ? kols.reduce((s, k) => s + (k.booking_fee_estimate ?? 0), 0) / kols.length
    : 0

  // Aggregate metrics per KOL
  const metricsByKol: Record<number, { followers: number; engagement: number }> = {}
  for (const m of metrics) {
    if (!metricsByKol[m.kol_id]) metricsByKol[m.kol_id] = { followers: 0, engagement: 0 }
    metricsByKol[m.kol_id].followers += m.follower_count ?? 0
    metricsByKol[m.kol_id].engagement =
      (metricsByKol[m.kol_id].engagement + (m.avg_engagement_rate ?? 0)) / 2
  }

  const kolScatterData = kols.map(k => ({
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

  const kolColumns: Column<KolProfile>[] = [
    { key: 'stage_name', label: 'Stage Name' },
    { key: 'main_niche', label: 'Niche' },
    { key: 'target_demographic_age', label: 'Target Demo' },
    { key: 'booking_fee_estimate', label: 'Booking Fee', format: v => formatUSD(v as number) },
  ]

  return (
    <div>
      <PageHeader title="Talent Pool" description="Directors and KOLs overview" />

      <Tabs defaultValue="directors">
        <TabsList className="mb-6">
          <TabsTrigger value="directors">Directors ({directors.length})</TabsTrigger>
          <TabsTrigger value="kols">KOLs ({kols.length})</TabsTrigger>
        </TabsList>

        {/* ── Directors Tab ── */}
        <TabsContent value="directors" className="flex flex-col gap-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Total Directors" value={directors.length} />
            <MetricCard label="Avg Experience" value={`${avgExp.toFixed(1)} yrs`} />
            <MetricCard label="Avg Day Rate" value={formatUSD(avgRate)} />
            <MetricCard label="Available" value={`${availableCount} (${formatPct(availabilityPct)})`} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Experience vs Day Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <ScatterChart
                  data={directorScatterData as Record<string, unknown>[]}
                  xKey="x"
                  yKey="y"
                  sizeKey="z"
                  xLabel="Years of Experience"
                  yLabel="Day Rate (USD)"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Directors by Location</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart
                  data={locationData as Record<string, unknown>[]}
                  xKey="location"
                  bars={[{ key: 'count', label: 'Directors' }]}
                  horizontal
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Director Profiles</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable columns={directorColumns} data={directors} maxRows={50} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── KOLs Tab ── */}
        <TabsContent value="kols" className="flex flex-col gap-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Total KOLs" value={kols.length} />
            <MetricCard label="Avg Followers" value={formatNumber(avgFollowers)} />
            <MetricCard label="Avg Engagement" value={formatPct(avgEngagement)} />
            <MetricCard label="Avg Booking Fee" value={formatUSD(avgBookingFee)} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Followers vs Engagement Rate (by Niche)</CardTitle>
            </CardHeader>
            <CardContent>
              <ScatterChart
                data={kolScatterData as Record<string, unknown>[]}
                xKey="x"
                yKey="y"
                colorKey="niche"
                xLabel="Total Followers"
                yLabel="Avg Engagement %"
              />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">KOL Accounts by Platform</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart
                  data={platformData as Record<string, unknown>[]}
                  xKey="platform"
                  bars={[{ key: 'count', label: 'Accounts' }]}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">KOLs by Niche</CardTitle>
              </CardHeader>
              <CardContent>
                <PieChart data={nichePieData} donut />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">KOL Profiles</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable columns={kolColumns} data={kols} maxRows={50} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
