import { NextResponse } from 'next/server'
import { readCsv } from '@/lib/data/loaders'
import type { KolProfile } from '@/lib/data/types'

export async function GET() {
  const data = readCsv<KolProfile>('04_kol_profiles.csv')
  return NextResponse.json(data)
}
