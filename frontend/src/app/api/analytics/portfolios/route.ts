import { NextResponse } from 'next/server'
import { readCsv } from '@/lib/data/loaders'
import type { Portfolio } from '@/lib/data/types'

export async function GET() {
  const data = readCsv<Portfolio>('06_portfolios.csv')
  return NextResponse.json(data)
}
