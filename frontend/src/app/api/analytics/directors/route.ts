import { NextResponse } from 'next/server'
import { readCsv } from '@/lib/data/loaders'
import type { DirectorProfile } from '@/lib/data/types'

export async function GET() {
  const data = readCsv<DirectorProfile>('03_director_profiles.csv')
  return NextResponse.json(data)
}
