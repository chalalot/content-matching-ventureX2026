interface UserRegistration {
  role: string
  created_at: string
}

interface MonthlyRoleGrowthData {
  roles: string[]
  data: Record<string, string | number>[]
}

function monthKey(dateStr: string): string | null {
  if (!dateStr) return null
  const match = dateStr.match(/^(\d{4})-(\d{2})/)
  return match ? `${match[1]}-${match[2]}` : null
}

function monthRange(start: string, end: string): string[] {
  const [startYear, startMonth] = start.split('-').map(Number)
  const [endYear, endMonth] = end.split('-').map(Number)
  const months: string[] = []

  for (
    let year = startYear, month = startMonth;
    year < endYear || (year === endYear && month <= endMonth);
    month++
  ) {
    months.push(`${year}-${String(month).padStart(2, '0')}`)
    if (month === 12) {
      year++
      month = 0
    }
  }

  return months
}

export function buildMonthlyRoleGrowthData(users: UserRegistration[]): MonthlyRoleGrowthData {
  const roles = [...new Set(users.map(u => u.role).filter(Boolean))]
  const countsByMonth: Record<string, Record<string, number>> = {}

  for (const user of users) {
    const month = monthKey(user.created_at)
    if (!month || !user.role) continue
    if (!countsByMonth[month]) countsByMonth[month] = {}
    countsByMonth[month][user.role] = (countsByMonth[month][user.role] ?? 0) + 1
  }

  const months = Object.keys(countsByMonth).sort()
  if (months.length === 0) {
    return { roles, data: [] }
  }

  const data = monthRange(months[0], months[months.length - 1]).map(month => {
    const row: Record<string, string | number> = { month }
    for (const role of roles) {
      row[role] = countsByMonth[month]?.[role] ?? 0
    }
    return row
  })

  return { roles, data }
}

