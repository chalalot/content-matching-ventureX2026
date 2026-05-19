import assert from 'node:assert/strict'
import { buildMonthlyRoleGrowthData } from './user-growth'

const users = [
  { role: 'BRAND', created_at: '2023-01-20 10:14:03' },
  { role: 'KOL', created_at: '2023-03-10 08:57:53' },
  { role: 'BRAND', created_at: '2023-03-14 12:40:24' },
]

assert.deepEqual(buildMonthlyRoleGrowthData(users), {
  roles: ['BRAND', 'KOL'],
  data: [
    { month: '2023-01', BRAND: 1, KOL: 0 },
    { month: '2023-02', BRAND: 0, KOL: 0 },
    { month: '2023-03', BRAND: 1, KOL: 1 },
  ],
})

