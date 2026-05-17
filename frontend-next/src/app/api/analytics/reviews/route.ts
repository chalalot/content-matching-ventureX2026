import { NextResponse } from 'next/server'
import { readCsv } from '@/lib/data/loaders'
import type { Review } from '@/lib/data/types'

export async function GET() {
  const data = readCsv<Review>('12_reviews.csv')
  return NextResponse.json(data)
}
