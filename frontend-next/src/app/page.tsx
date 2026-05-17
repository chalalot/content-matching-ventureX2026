import { readCsv } from '@/lib/data/loaders'
import type { User, Project, Match } from '@/lib/data/types'
import MetricCard from '@/components/shared/MetricCard'
import PageHeader from '@/components/layout/PageHeader'
import { Separator } from '@/components/ui/separator'
import { formatPct } from '@/lib/utils/formatters'

export default function HomePage() {
  const users = readCsv<User>('01_users.csv')
  const projects = readCsv<Project>('09_projects.csv')
  const matches = readCsv<Match>('11_matches_applications.csv')

  const totalUsers = users.length
  const activeProjects = projects.filter(
    p => p.status === 'open' || p.status === 'in_progress'
  ).length
  const totalMatches = matches.length
  const avgScore =
    matches.length > 0
      ? matches.reduce((s, m) => s + (m.match_score ?? 0), 0) / matches.length
      : 0
  const hiredCount = matches.filter(
    m => m.status === 'hired' || m.status === 'completed'
  ).length
  const hireRate = totalMatches > 0 ? (hiredCount / totalMatches) * 100 : 0

  // Role counts
  const roleCounts: Record<string, number> = {}
  for (const u of users) {
    const r = u.role ?? 'unknown'
    roleCounts[r] = (roleCounts[r] ?? 0) + 1
  }

  return (
    <div>
      <PageHeader
        title="ALIEN Platform"
        description="Content matching analytics dashboard"
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <MetricCard label="Total Users" value={totalUsers} />
        <MetricCard label="Active Projects" value={activeProjects} />
        <MetricCard label="Total Matches" value={totalMatches} />
        <MetricCard label="Avg Match Score" value={avgScore.toFixed(1)} />
        <MetricCard label="Hire Rate" value={formatPct(hireRate)} />
      </div>

      <Separator className="mb-6" />

      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
        Users by Role
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Object.entries(roleCounts).map(([role, count]) => (
          <MetricCard
            key={role}
            label={role.replace(/_/g, ' ')}
            value={count}
            sub={`${formatPct((count / totalUsers) * 100)} of users`}
          />
        ))}
      </div>
    </div>
  )
}
