import { NextResponse } from 'next/server'

export const maxDuration = 120

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8000'
    const res = await fetch(`${backendUrl}/match/kol`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[/api/match-kol] Backend error:', message)
    return NextResponse.json({ error: `Backend unavailable: ${message}` }, { status: 503 })
  }
}
