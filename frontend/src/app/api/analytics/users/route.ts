import { NextResponse } from 'next/server'
import { readCsv } from '@/lib/data/loaders'
import type { User } from '@/lib/data/types'

export async function GET() {
  const data = readCsv<User>('01_users.csv')
  return NextResponse.json(data)
}
