import { readCsv } from '@/lib/data/loaders'
import type { User, Project, Match, Review, DirectorProfile, KolProfile } from '@/lib/data/types'
import PageHeader from '@/components/layout/PageHeader'
import AreaChart from '@/components/charts/AreaChart'
import BarChart from '@/components/charts/BarChart'
import PieChart from '@/components/charts/PieChart'
import DataTable from '@/components/shared/DataTable'
import type { Column } from '@/components/shared/DataTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function monthKey(dateStr: string): string {
  if (!dateStr) return 'Unknown'
  return dateStr.slice(0, 7) // YYYY-MM
}

export default function OverviewPage() {
  const users = readCsv<User>('01_users.csv')
  const projects = readCsv<Project>('09_projects.csv')
  const matches = readCsv<Match>('11_matches_applications.csv')
  const reviews = readCsv<Review>('12_reviews.csv')
  const directors = readCsv<DirectorProfile>('03_director_profiles.csv')
  const kols = readCsv<KolProfile>('04_kol_profiles.csv')

  // Monthly registrations by role
  const monthRoleMap: Record<string, Record<string, number>> = {}
  for (const u of users) {
    const month = monthKey(u.created_at)
    if (!monthRoleMap[month]) monthRoleMap[month] = {}
    monthRoleMap[month][u.role] = (monthRoleMap[month][u.role] ?? 0) + 1
  }
  const allRoles = [...new Set(users.map(u => u.role))]
  const growthData = Object.entries(monthRoleMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, counts]) => ({ month, ...counts }))

  // User status pie
  const statusCounts: Record<string, number> = {}
  for (const u of users) {
    statusCounts[u.status ?? 'unknown'] = (statusCounts[u.status ?? 'unknown'] ?? 0) + 1
  }
  const statusPieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }))

  // Role bar
  const roleCounts: Record<string, number> = {}
  for (const u of users) {
    roleCounts[u.role ?? 'unknown'] = (roleCounts[u.role ?? 'unknown'] ?? 0) + 1
  }
  const roleBarData = Object.entries(roleCounts).map(([role, count]) => ({ role, count }))

  // Geo distribution
  const geoMap: Record<string, { director: number; kol: number }> = {}
  for (const d of directors) {
    const loc = d.primary_location ?? 'Unknown'
    if (!geoMap[loc]) geoMap[loc] = { director: 0, kol: 0 }
    geoMap[loc].director++
  }
  for (const k of kols) {
    // KOLs don't have location in profile; use 'Unknown'
    const loc = 'Unknown'
    if (!geoMap[loc]) geoMap[loc] = { director: 0, kol: 0 }
    geoMap[loc].kol++
  }
  const geoData = Object.entries(geoMap).map(([location, v]) => ({ location, ...v }))

  // Health summary table
  interface HealthRow {
    entity: string
    total: number
    active: number
    pct: string
  }
  const totalActiveUsers = users.filter(u => u.status === 'active').length
  const openProjects = projects.filter(p => p.status === 'open').length
  const pendingMatches = matches.filter(m => m.status === 'pending').length
  const healthData: HealthRow[] = [
    { entity: 'Users', total: users.length, active: totalActiveUsers, pct: `${((totalActiveUsers / users.length) * 100).toFixed(1)}%` },
    { entity: 'Projects', total: projects.length, active: openProjects, pct: `${((openProjects / projects.length) * 100).toFixed(1)}%` },
    { entity: 'Matches', total: matches.length, active: pendingMatches, pct: `${((pendingMatches / matches.length) * 100).toFixed(1)}%` },
    { entity: 'Reviews', total: reviews.length, active: reviews.length, pct: '100%' },
    { entity: 'Directors', total: directors.length, active: directors.filter(d => d.availability_status === 'available').length, pct: `${((directors.filter(d => d.availability_status === 'available').length / directors.length) * 100).toFixed(1)}%` },
    { entity: 'KOLs', total: kols.length, active: kols.length, pct: '100%' },
  ]
  const healthColumns: Column<HealthRow>[] = [
    { key: 'entity', label: 'Entity' },
    { key: 'total', label: 'Total' },
    { key: 'active', label: 'Active/Open' },
    { key: 'pct', label: 'Rate' },
  ]

  return (
    <div>
      <PageHeader title="Overview" description="Platform-wide metrics and health summary" />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">Monthly User Registrations by Role</CardTitle>
        </CardHeader>
        <CardContent>
          <AreaChart
            data={growthData as Record<string, unknown>[]}
            xKey="month"
            lines={allRoles.map(r => ({ key: r, label: r }))}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">User Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <PieChart data={statusPieData} donut />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Users by Role</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={roleBarData as Record<string, unknown>[]}
              xKey="role"
              bars={[{ key: 'count', label: 'Users' }]}
              horizontal
            />
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">Talent Geographic Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart
            data={geoData as Record<string, unknown>[]}
            xKey="location"
            bars={[
              { key: 'director', label: 'Directors' },
              { key: 'kol', label: 'KOLs' },
            ]}
            stacked
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Platform Health Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={healthColumns} data={healthData} />
        </CardContent>
      </Card>
    </div>
  )
}
