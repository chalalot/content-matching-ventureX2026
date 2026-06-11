'use client'

import { useState, useEffect } from 'react'
import { getDirectors, getPortfolios } from '@/lib/api/client'
import type { DirectorProfile, Portfolio } from '@/lib/data/types'
import PageHeader from '@/components/layout/PageHeader'
import MetricCard from '@/components/shared/MetricCard'
import BarChart from '@/components/charts/BarChart'
import ScatterChart from '@/components/charts/ScatterChart'
import DataTable from '@/components/shared/DataTable'
import type { Column } from '@/components/shared/DataTable'
import { ChartSkeleton, TableSkeleton } from '@/components/shared/PageSkeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatUSD, formatPct } from '@/lib/utils/formatters'
import { isAvailableStatus } from '@/lib/data/status'

export default function DirectorsPage() {
  const [directors, setDirectors] = useState<DirectorProfile[]>([])
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    Promise.all([getDirectors(), getPortfolios()])
      .then(([d, p]) => {
        setDirectors(d)
        setPortfolios(p)
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  const avgExp =
    directors.length > 0
      ? directors.reduce((s, d) => s + (d.years_of_experience ?? 0), 0) / directors.length
      : 0
  const avgRate =
    directors.length > 0
      ? directors.reduce((s, d) => s + (d.base_day_rate ?? 0), 0) / directors.length
      : 0
  const availableCount = directors.filter(d => isAvailableStatus(d.availability_status)).length
  const availabilityPct = directors.length > 0 ? (availableCount / directors.length) * 100 : 0

  const portfolioCountByUser: Record<string, number> = {}
  for (const p of portfolios) {
    portfolioCountByUser[p.user_id] = (portfolioCountByUser[p.user_id] ?? 0) + 1
  }

  const scatterData = directors.map(d => ({
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

  const columns: Column<DirectorProfile>[] = [
    { key: 'full_name', label: 'Name' },
    { key: 'years_of_experience', label: 'Experience (yrs)' },
    { key: 'base_day_rate', label: 'Day Rate', format: v => formatUSD(v as number) },
    { key: 'primary_location', label: 'Location' },
    { key: 'availability_status', label: 'Availability' },
  ]

  return (
    <div>
      <PageHeader title="Directors" description="Director talent pool and availability" />

      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Total Directors" value={directors.length} loading={isLoading} />
          <MetricCard label="Avg Experience" value={`${avgExp.toFixed(1)} yrs`} loading={isLoading} />
          <MetricCard label="Avg Day Rate" value={formatUSD(avgRate)} loading={isLoading} />
          <MetricCard label="Available" value={`${availableCount} (${formatPct(availabilityPct)})`} loading={isLoading} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Experience vs Day Rate</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <ChartSkeleton />
              ) : (
                <ScatterChart
                  data={scatterData as Record<string, unknown>[]}
                  xKey="x"
                  yKey="y"
                  sizeKey="z"
                  xLabel="Years of Experience"
                  yLabel="Day Rate (USD)"
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Directors by Location</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <ChartSkeleton />
              ) : (
                <BarChart
                  data={locationData as Record<string, unknown>[]}
                  xKey="location"
                  bars={[{ key: 'count', label: 'Directors' }]}
                  horizontal
                />
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Director Profiles</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <TableSkeleton /> : <DataTable columns={columns} data={directors} maxRows={50} />}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
