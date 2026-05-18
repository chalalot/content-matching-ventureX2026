import { NextResponse } from 'next/server'
import { readCsv } from '@/lib/data/loaders'
import type { SocialMetric } from '@/lib/data/types'

export async function GET() {
  const data = readCsv<SocialMetric>('05_kol_social_metrics.csv')
  return NextResponse.json(data)
}
