# Implementation Plan — Next.js Frontend

**Spec:** `2026-05-18-nextjs-frontend-redesign.md`  
**Output:** `frontend/` at repo root  
**Delete when done:** old Streamlit and vanilla JS frontend code

---

## Phase 1 — Project Setup (~1.5h)

### 1.1 Scaffold Next.js app

```bash
npx create-next-app@latest frontend \
  --typescript --tailwind --app --src-dir \
  --no-eslint --import-alias "@/*"
cd frontend
```

### 1.2 Install shadcn/ui + dependencies

```bash
npx shadcn@latest init
# Choose: Default style, Neutral color, CSS variables: yes
```

Add required shadcn components:
```bash
npx shadcn@latest add card table select slider textarea input button badge tabs separator
npx shadcn@latest add chart
```

Install CSV parser:
```bash
npm install papaparse
npm install --save-dev @types/papaparse
```

### 1.3 Configure monochrome theme

Edit `src/app/globals.css` — override shadcn CSS vars:
```css
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 0%;
  --card: 0 0% 100%;
  --card-foreground: 0 0% 0%;
  --muted: 0 0% 96%;
  --muted-foreground: 0 0% 45%;
  --border: 0 0% 90%;
  --input: 0 0% 90%;
  --primary: 0 0% 0%;
  --primary-foreground: 0 0% 100%;
  --sidebar-bg: 0 0% 0%;
  --sidebar-fg: 0 0% 100%;
  --sidebar-muted: 0 0% 30%;
}
```

Chart palette constant in `src/lib/utils/chart-colors.ts`:
```ts
export const CHART_COLORS = ["#000", "#333", "#555", "#777", "#999", "#bbb", "#ddd"]
```

### 1.4 Create folder structure

```bash
mkdir -p src/components/{layout,charts,shared,match-engine}
mkdir -p src/lib/{data,api,utils}
mkdir -p src/app/{overview,projects,talent,matching,roi,match-engine}
mkdir -p src/app/api/{analytics/{users,projects,matches,directors,kols,social-metrics,portfolios,reviews,roi},match}
```

### 1.5 Symlink dataset

```bash
# From frontend/
ln -s ../dataset dataset
```

**Commit: `feat: scaffold Next.js app with shadcn and monochrome theme`**

---

## Phase 2 — Data Layer (~2.5h)

### 2.1 TypeScript types — `src/lib/data/types.ts`

Define interfaces matching CSV column names for all 12 datasets:
- `User` — user_id, email, role, created_at, last_login, status
- `CompanyProfile` — company_id, user_id, company_name, industry, website, contact_name, contact_phone
- `DirectorProfile` — director_id, user_id, full_name, bio, years_of_experience, base_day_rate, primary_location, availability_status
- `KolProfile` — kol_id, user_id, stage_name, bio, main_niche, target_demographic_age, booking_fee_estimate
- `SocialMetric` — metric_id, kol_id, platform, handle_url, follower_count, avg_engagement_rate, last_updated
- `Portfolio` — portfolio_id, user_id, project_title, video_url, role_played, thumbnail_url
- `Category` — category_id, name, type
- `UserCategory` — user_id, category_id
- `Project` — project_id, company_id, title, description, project_type, budget_min, budget_max, shooting_location, timeline_start, timeline_end, status
- `ProjectRequirement` — requirement_id, project_id, talent_type, required_category_id, min_followers
- `Match` — match_id, project_id, talent_user_id, initiated_by, status, proposed_fee, match_score, created_at
- `Review` — review_id, project_id, reviewer_id, reviewee_id, rating, feedback, punctuality_score, creativity_score
- `RoiRow` — match_id, project_id, talent_user_id, talent_name, talent_type, company_name, title, project_type, initiated_by, status, proposed_fee, match_score, created_at, budget_min, budget_max, total_followers, avg_engagement, estimated_reach, est_impressions, est_conversions, est_revenue_vnd, cost_efficiency_score, quality_score, roi_percent

Also export `BriefRequest`, `ScoreBreakdown`, `CandidateResult`, `MatchResponse` (mirror `backend/models.py`).

### 2.2 CSV loader — `src/lib/data/loaders.ts`

```ts
import path from 'path'
import fs from 'fs'
import Papa from 'papaparse'

const DATASET_DIR = path.join(process.cwd(), 'dataset')

export function readCsv<T>(filename: string): T[] {
  const filePath = path.join(DATASET_DIR, filename)
  const csv = fs.readFileSync(filePath, 'utf-8')
  const { data } = Papa.parse<T>(csv, { header: true, dynamicTyping: true, skipEmptyLines: true })
  return data
}
```

Note: This is server-only (`fs` import). Never import in client components.

### 2.3 API routes — one file per dataset

Pattern for each `app/api/analytics/[resource]/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { readCsv } from '@/lib/data/loaders'
import type { User } from '@/lib/data/types'

export async function GET() {
  const data = readCsv<User>('01_users.csv')
  return NextResponse.json(data)
}
```

Files to create (filename → CSV):
- `users/route.ts` → `01_users.csv`
- `projects/route.ts` → `09_projects.csv` (also reads `02_company_profiles.csv`, joins on company_id, returns merged rows with `company_name`)
- `matches/route.ts` → `11_matches_applications.csv`
- `directors/route.ts` → `03_director_profiles.csv`
- `kols/route.ts` → `04_kol_profiles.csv`
- `social-metrics/route.ts` → `05_kol_social_metrics.csv`
- `portfolios/route.ts` → `06_portfolios.csv`
- `reviews/route.ts` → `12_reviews.csv`
- `roi/route.ts` → `roi_analysis.csv`

`match/route.ts` — proxy to FastAPI:
```ts
export async function POST(req: Request) {
  const body = await req.json()
  const res = await fetch(`${process.env.BACKEND_URL ?? 'http://localhost:8000'}/match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
```

### 2.4 API client — `src/lib/api/client.ts`

Typed fetch wrappers. All calls go to `/api/analytics/*` (same origin):
```ts
export const getUsers = () => fetch('/api/analytics/users').then(r => r.json()) as Promise<User[]>
export const getProjects = () => fetch('/api/analytics/projects').then(r => r.json()) as Promise<ProjectWithCompany[]>
// ... one per resource
export const matchDirectors = (brief: BriefRequest) =>
  fetch('/api/match', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(brief) })
    .then(r => { if (!r.ok) throw new Error(`API error: ${r.status}`); return r.json() }) as Promise<MatchResponse>
```

### 2.5 Formatters — `src/lib/utils/formatters.ts`

Port from `utils/formatters.py`:
```ts
export function formatVND(amount: number | null | undefined): string { ... }
export function formatNumber(n: number | null | undefined): string { ... }
export function formatPct(value: number | null | undefined, decimals = 1): string { ... }
```

**Commit: `feat: add data layer — types, CSV loaders, API routes, client`**

---

## Phase 3 — Layout + Shared Components (~2h)

### 3.1 Root layout — `src/app/layout.tsx`

```tsx
// Side-by-side: fixed Sidebar (w-56, black) + scrollable main content (white)
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-background p-6">{children}</main>
      </body>
    </html>
  )
}
```

### 3.2 Sidebar — `src/components/layout/Sidebar.tsx`

Nav links with active state (usePathname):
```
👽 ALIEN Platform   ← logo/title
─────────────────
Home
Overview
Projects
Talent Pool
Matching
ROI Analysis
─────────────────
Match Engine
```

Black background, white text, muted active indicator.

### 3.3 PageHeader — `src/components/layout/PageHeader.tsx`

```tsx
interface PageHeaderProps { title: string; description?: string }
```
Renders `<h1>` + optional `<p>` with `text-muted-foreground`.

### 3.4 MetricCard — `src/components/shared/MetricCard.tsx`

Wraps shadcn `Card`. Props: `label`, `value`, `delta?` (string), `deltaPositive?` (bool).

### 3.5 DataTable — `src/components/shared/DataTable.tsx`

```tsx
interface Column<T> { key: keyof T; label: string; format?: (v: any) => string }
interface DataTableProps<T> { columns: Column<T>[]; data: T[]; }
```

Uses shadcn `Table`. Client component — no server data fetch inside.

### 3.6 FilterBar — `src/components/shared/FilterBar.tsx`

```tsx
interface FilterOption { label: string; value: string }
interface FilterConfig { key: string; label: string; options: FilterOption[] }
interface FilterBarProps {
  filters: FilterConfig[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  onReset: () => void
}
```

Renders column of shadcn `Select` components + Reset `Button`.

### 3.7 Chart wrappers — `src/components/charts/`

Each wraps shadcn chart primitives. Accept typed props, apply `CHART_COLORS`, no styling logic in pages.

- `AreaChart.tsx` — props: `data`, `xKey`, `lines: {key, label}[]`
- `BarChart.tsx` — props: `data`, `xKey`, `bars: {key, label}[]`, `horizontal?`, `stacked?`
- `PieChart.tsx` — props: `data: {name, value}[]`, `donut?`
- `ScatterChart.tsx` — props: `data`, `xKey`, `yKey`, `colorKey?`, `sizeKey?`, `nameKey?`
- `FunnelChart.tsx` — props: `data: {stage, count}[]`

**Commit: `feat: add layout, shared components, and chart wrappers`**

---

## Phase 4 — Analytics Pages (~4h)

Build each page as a server component that fetches data, passes to client chart/table components.

### 4.1 Home — `src/app/page.tsx`

Fetches `/api/analytics/users`, `/api/analytics/projects`, `/api/analytics/matches`.
Computes: total_users, active_projects, total_matches, avg_score, hire_rate, role_counts.
Renders: 5 `MetricCard` row + role breakdown `MetricCard` per role.

### 4.2 Overview — `src/app/overview/page.tsx`

Fetches users, projects, matches, reviews, directors, kols.
- `AreaChart` — monthly registrations by role
- 2-col: `PieChart` (status) + `BarChart` (role, horizontal)
- `BarChart` — geo distribution (stacked director/KOL by location)
- `DataTable` — 6-row health summary

### 4.3 Projects — `src/app/projects/page.tsx`

Client component (needs filter state). Fetches projects+companies on load.
- `FilterBar` sidebar (type/status/location)
- 4 `MetricCard`
- 2-col: `BarChart` (budget by type, box approximated as range bar) + `BarChart` (status funnel)
- `BarChart` horizontal Gantt (project × timeline range)
- `DataTable` with formatted budget columns

### 4.4 Talent Pool — `src/app/talent/page.tsx`

Client component (tabs + filter state). Fetches directors, kols, social-metrics, portfolios.
- `Tabs` with Directors | KOLs
- Directors: 4 `MetricCard`, `ScatterChart` (experience × rate, size=portfolio), `BarChart` (location), `DataTable`
- KOLs: 4 `MetricCard`, `ScatterChart` (followers × engagement, color=niche), `BarChart` (platform), `PieChart` (niche), `DataTable`

### 4.5 Matching — `src/app/matching/page.tsx`

Client component (filter state). Fetches matches, projects, users, directors, kols (for name join).
- `FilterBar` sidebar
- 4 `MetricCard`
- 2-col: `FunnelChart` + `BarChart` (source comparison grouped)
- 2-col: `BarChart` histogram (score distribution) + `ScatterChart` (fee × score)
- `DataTable`

### 4.6 ROI — `src/app/roi/page.tsx`

Client component (filter state). Fetches roi.
- Info `Card` callout
- `FilterBar` sidebar
- 4 `MetricCard` (avg, median, best, worst)
- 2-col: `BarChart` (ROI by matching type) + `BarChart` (ROI by project type)
- `BarChart` (ROI by talent type) + inline metrics
- 2-col: `ScatterChart` (fee × ROI, size=score) + `ScatterChart` (quality × ROI, trendline)
- 2-col: `DataTable` top 10 + `DataTable` bottom 10
- Conditional warning `Card` for negative ROI count + extreme ROI count

**Commit: `feat: add all analytics pages`**

---

## Phase 5 — Match Engine Page (~2h)

### 5.1 ScoreBreakdown — `src/components/match-engine/ScoreBreakdown.tsx`

```tsx
interface ScoreBreakdownProps { breakdown: ScoreBreakdown }
```

7 rows. Each row: Vietnamese label + horizontal fill bar (`w-[XX%]`) + `value/max` text.

Label map:
```ts
const LABELS: Record<keyof ScoreBreakdown, [string, number]> = {
  genre_match:     ['Thể loại',    25],
  style_match:     ['Phong cách',  20],
  specialty_match: ['Chuyên ngành',20],
  performance:     ['Hiệu suất',   15],
  availability:    ['Sẵn sàng',    10],
  experience:      ['Kinh nghiệm',  5],
  budget_fit:      ['Ngân sách',    5],
}
```

### 5.2 CandidateCard — `src/components/match-engine/CandidateCard.tsx`

Props: `candidate: CandidateResult`.

Layout:
- Header row: `#rank Name` + score circle (monochrome, size reflects score ≥70/50-69/<50 → border weight difference)
- Availability `Badge`: "Available · từ [date]" or "Booked"
- `ScoreBreakdown`
- Explanation text paragraph
- Notable brands as `Badge` chips

### 5.3 BriefForm — `src/components/match-engine/BriefForm.tsx`

Client component. Local state for all 8 fields.

Fields (all shadcn):
- Brand: `Input`
- Industry: `Select` (10 options)
- Campaign type: `Select` (5 options)
- Tone: `Select` (6 options)
- Budget USD: `Input type=number` + `Slider` ($1K–$250K, step $1K)
- Timeline: `Slider` (2–12 weeks)
- Description: `Textarea`
- Top N: `Slider` (3–10)

Submit `Button`: disabled when `!brand || description.length < 30 || loading`. Shows spinner (animate-spin) when loading.

On submit: calls `matchDirectors(brief)` from `lib/api/client.ts`. On success: lifts result to parent via `onResult(data)`. On error: shows error message below button.

### 5.4 Page — `src/app/match-engine/page.tsx`

Client component. State: `result: MatchResponse | null`, `loading`, `error`.

Layout:
- `PageHeader` title "Match Engine" + description
- `BriefForm` with `onResult` + `onLoading` callbacks
- When result: response time + total candidates label above cards
- `CandidateCard` for each in `result.shortlist`

**Commit: `feat: add match engine page and components`**

---

## Phase 6 — Verification + Cleanup (~1h)

### 6.1 Verify

```bash
cd frontend && npm run dev
```

Checklist:
- [ ] All 7 pages load without error
- [ ] Home KPI numbers match dataset-derived source values
- [ ] Projects filters work (type/status/location)
- [ ] Talent tabs switch correctly
- [ ] ROI warnings appear when negative ROI rows exist
- [ ] Match Engine form validates (brand required, description min 30 chars)
- [ ] Match Engine submits to `/api/match` → proxies to FastAPI (or shows error if backend down)
- [ ] No TypeScript errors (`npm run build`)

### 6.2 Env file

Create `frontend/.env.local`:
```
BACKEND_URL=http://localhost:8000
```

### 6.3 Remove old files

Once verified:
```bash
# From repo root
rm -rf frontend/          # vanilla JS frontend
Remove retired Streamlit files and old vanilla frontend files.
```

### 6.4 Update README

Update `Setup & Chạy` section:
```bash
# Frontend (analytics + matching UI)
cd frontend && npm install && npm run dev
# → http://localhost:3000

# Backend (AI matching API — needed for /match-engine page)
cd backend && uvicorn main:app --reload
```

**Commit: `feat: complete Next.js frontend — remove Streamlit and vanilla JS`**

---

## Environment Variables

| Variable | Where | Value |
|---|---|---|
| `BACKEND_URL` | `frontend/.env.local` | `http://localhost:8000` (local) or Railway URL (prod) |

---

## Estimated Time

| Phase | Time |
|---|---|
| 1 — Setup | 1.5h |
| 2 — Data layer | 2.5h |
| 3 — Shared components | 2h |
| 4 — Analytics pages | 4h |
| 5 — Match engine | 2h |
| 6 — Verify + cleanup | 1h |
| **Total** | **~13h** |
