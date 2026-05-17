import { NextResponse } from 'next/server'
import { readCsv } from '@/lib/data/loaders'
import type { Match } from '@/lib/data/types'

export async function GET() {
  const data = readCsv<Match>('11_matches_applications.csv')
  return NextResponse.json(data)
}
