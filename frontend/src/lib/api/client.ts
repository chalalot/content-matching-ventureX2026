import type {
  User,
  ProjectWithCompany,
  Match,
  DirectorProfile,
  KolProfile,
  SocialMetric,
  Portfolio,
  Review,
  RoiRow,
  BriefRequest,
  MatchResponse,
  KolBriefRequest,
  KolMatchResponse,
  KolCandidateResult,
} from '@/lib/data/types'

const base = '/api/analytics'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: 'no-store' })
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json() as Promise<T>
}

export const getUsers = () => get<User[]>(`${base}/users`)
export const getProjects = () => get<ProjectWithCompany[]>(`${base}/projects`)
export const getMatches = () => get<Match[]>(`${base}/matches`)
export const getDirectors = () => get<DirectorProfile[]>(`${base}/directors`)
export const getKols = () => get<KolProfile[]>(`${base}/kols`)
export const getSocialMetrics = () => get<SocialMetric[]>(`${base}/social-metrics`)
export const getPortfolios = () => get<Portfolio[]>(`${base}/portfolios`)
export const getReviews = () => get<Review[]>(`${base}/reviews`)
export const getRoi = () => get<RoiRow[]>(`${base}/roi`)

export async function matchDirectors(brief: BriefRequest): Promise<MatchResponse> {
  const res = await fetch('/api/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(brief),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    throw new Error(err?.error ?? `API error: ${res.status}`)
  }
  return res.json() as Promise<MatchResponse>
}

export async function matchKols(brief: KolBriefRequest): Promise<KolMatchResponse> {
  const res = await fetch('/api/match-kol', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(brief),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    throw new Error(err?.error ?? `API error: ${res.status}`)
  }
  return res.json() as Promise<KolMatchResponse>
}

// --- Layer 3 realtime: stream KOL matching over WebSocket --------------------

// The browser connects directly to the FastAPI backend (Next.js API routes
// can't proxy a websocket). Override with NEXT_PUBLIC_BACKEND_WS_URL in prod.
function backendWsUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_BACKEND_WS_URL
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  return 'ws://localhost:8000'
}

export interface KolMatchStreamEvents {
  onInit?: (info: { total_candidates_considered: number; top_n: number }) => void
  onCandidate?: (candidate: KolCandidateResult) => void
  onComplete?: (result: KolMatchResponse) => void
  onError?: (message: string) => void
}

// Returns a cancel function — call it to close the socket early (e.g. unmount).
export function streamKolMatch(brief: KolBriefRequest, events: KolMatchStreamEvents): () => void {
  const ws = new WebSocket(`${backendWsUrl()}/ws/match/kol`)
  let finished = false

  ws.onopen = () => ws.send(JSON.stringify(brief))

  ws.onmessage = (e) => {
    let msg: { type: string; [k: string]: unknown }
    try {
      msg = JSON.parse(e.data)
    } catch {
      return
    }
    if (msg.type === 'init') {
      events.onInit?.({
        total_candidates_considered: Number(msg.total_candidates_considered ?? 0),
        top_n: Number(msg.top_n ?? 0),
      })
    } else if (msg.type === 'candidate') {
      events.onCandidate?.(msg.data as KolCandidateResult)
    } else if (msg.type === 'complete') {
      finished = true
      events.onComplete?.(msg.data as KolMatchResponse)
      ws.close()
    } else if (msg.type === 'error') {
      finished = true
      events.onError?.(String(msg.message ?? 'Unknown server error'))
      ws.close()
    }
  }

  ws.onerror = () => {
    if (!finished) events.onError?.('WebSocket connection error — is the backend running?')
  }

  ws.onclose = () => {
    if (!finished) events.onError?.('Connection closed before results finished.')
  }

  return () => {
    finished = true // suppress the "closed early" error on intentional cancel
    ws.close()
  }
}
