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
