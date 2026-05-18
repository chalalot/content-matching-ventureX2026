import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8000'
    const res = await fetch(`${backendUrl}/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Backend unavailable: ${message}` }, { status: 503 })
  }
}
