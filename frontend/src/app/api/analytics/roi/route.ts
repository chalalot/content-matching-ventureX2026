import { NextResponse } from 'next/server'
import { readCsv } from '@/lib/data/loaders'
import type { RoiRow } from '@/lib/data/types'

export async function GET() {
  const data = readCsv<RoiRow>('roi_analysis.csv')
  return NextResponse.json(data)
}
