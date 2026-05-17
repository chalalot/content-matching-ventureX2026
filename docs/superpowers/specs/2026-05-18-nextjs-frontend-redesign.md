# Frontend Redesign — Next.js + shadcn/ui

**Date:** 2026-05-18  
**Status:** Approved  
**Replaces:** Streamlit analytics dashboard (`app.py` + `pages/`) + vanilla JS AI Matching frontend (`frontend/`)

---

## Problem

Streamlit is a prototyping tool — limited layout control, no component reuse, not deployable as a real product. Vanilla JS frontend is disconnected, unstyled, and not extensible. Both need replacing with a single, properly architected frontend.

---

## Goal

Single Next.js App Router application that:
- Preserves 100% of current Streamlit features and displayed data
- Integrates AI Matching Engine UI into the same app
- Uses shadcn/ui exclusively for all UI primitives and charts
- Renders in black and white only — no custom accent colors
- Is structured for future expansion (real paginated backend, new pages, auth)

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | shadcn native target, API routes, Vercel deploy |
| UI primitives | shadcn/ui | Requirement |
| Charts | shadcn/ui charts (Recharts) | Ships with shadcn, monochrome-capable |
| Styling | Tailwind CSS | shadcn default |
| CSV parsing | `papaparse` | Server-side in API routes |
| Language | TypeScript | Type safety across data layer |

---

## Pages

| Route | Replaces | Content |
|---|---|---|
| `/` | `app.py` | Platform KPI cards + users by role |
| `/overview` | `1_📊_Overview.py` | User growth, distributions, geo, health table |
| `/projects` | `2_🎬_Projects.py` | Filters, budget charts, Gantt, table |
| `/talent` | `3_🌟_Talent_Pool.py` | Directors tab + KOLs tab |
| `/matching` | `4_🔗_Matching.py` | Funnel, source comparison, score charts, table |
| `/roi` | `5_💰_ROI_Analysis.py` | ROI charts, cost efficiency, top/bottom 10, warnings |
| `/match-engine` | `frontend/index.html` | Brief form → shortlist cards |

---

## Folder Structure

```
src/
├── app/
│   ├── layout.tsx                  # Root layout: sidebar + main content area
│   ├── page.tsx                    # Home — KPI cards
│   ├── overview/
│   │   └── page.tsx
│   ├── projects/
│   │   └── page.tsx
│   ├── talent/
│   │   └── page.tsx
│   ├── matching/
│   │   └── page.tsx
│   ├── roi/
│   │   └── page.tsx
│   ├── match-engine/
│   │   └── page.tsx
│   └── api/
│       ├── analytics/
│       │   ├── users/route.ts
│       │   ├── projects/route.ts
│       │   ├── matches/route.ts
│       │   ├── directors/route.ts
│       │   ├── kols/route.ts
│       │   ├── social-metrics/route.ts
│       │   ├── portfolios/route.ts
│       │   ├── reviews/route.ts
│       │   └── roi/route.ts
│       └── match/route.ts          # Proxy → FastAPI /match
├── components/
│   ├── ui/                         # shadcn generated — never edit manually
│   ├── layout/
│   │   ├── Sidebar.tsx             # Nav links, active state
│   │   └── PageHeader.tsx          # Page title + optional description
│   ├── charts/                     # Thin wrappers — accept typed props, render shadcn chart
│   │   ├── AreaChart.tsx
│   │   ├── BarChart.tsx
│   │   ├── PieChart.tsx
│   │   ├── ScatterChart.tsx
│   │   └── FunnelChart.tsx
│   ├── shared/
│   │   ├── MetricCard.tsx          # KPI number display (label + value + optional delta)
│   │   ├── DataTable.tsx           # shadcn Table wrapper, accepts columns + data
│   │   └── FilterBar.tsx           # Sidebar filter panel: selects + reset button
│   └── match-engine/
│       ├── BriefForm.tsx           # All 8 brief fields
│       ├── CandidateCard.tsx       # One result card
│       └── ScoreBreakdown.tsx      # 7 horizontal score bars
├── lib/
│   ├── data/
│   │   ├── loaders.ts              # readCsv(filename) → typed rows (server-side only)
│   │   └── types.ts                # TypeScript types for all 12 datasets + ROI
│   ├── api/
│   │   └── client.ts               # Typed fetch wrappers: getUsers(), getProjects(), etc.
│   └── utils/
│       └── formatters.ts           # formatVND(), formatNumber(), formatPct()
dataset/                            # Existing CSVs — untouched, moved to root or symlinked
```

---

## Data Layer

### Current (CSV)

Each API route reads from `dataset/*.csv` using `papaparse`:

```ts
// app/api/analytics/users/route.ts
import { readCsv } from '@/lib/data/loaders'
export async function GET() {
  const data = await readCsv<User>('01_users.csv')
  return Response.json(data)
}
```

### Future (Paginated Backend)

Only `route.ts` files change — zero component changes required:

```ts
export async function GET(req: Request) {
  const { page, size } = parseSearchParams(req)
  return fetch(`${process.env.BACKEND_URL}/api/users?page=${page}&size=${size}`)
}
```

Frontend components call `lib/api/client.ts` functions — they never import from `lib/data/loaders.ts` directly.

---

## Design System

### Color

Black and white only. No custom accent colors.

```css
/* Only CSS variables used */
--background: 0 0% 100%;       /* white content */
--foreground: 0 0% 0%;         /* black text */
--muted: 0 0% 96%;             /* light gray backgrounds */
--border: 0 0% 90%;            /* gray borders */
--sidebar-bg: 0 0% 0%;         /* black sidebar */
--sidebar-fg: 0 0% 100%;       /* white sidebar text */
```

Charts use a stepped grayscale palette: `["#000", "#333", "#555", "#777", "#999", "#bbb", "#ddd"]`

### Components

All UI from shadcn/ui:
- `Card`, `CardHeader`, `CardContent` — KPI cards, chart containers
- `Table`, `TableHeader`, `TableRow`, `TableCell` — all data tables
- `Select`, `SelectItem` — all dropdowns/filters
- `Slider` — budget, timeline, top_n inputs
- `Textarea`, `Input` — brief form fields
- `Button` — submit actions
- `Badge` — availability status, role tags
- `Tabs`, `TabsContent` — Directors/KOLs tab in Talent page
- `Separator`, `Sheet` — layout utilities

---

## Page Feature Inventory

### `/` — Home

- 5 `MetricCard`: Total Users, Active Projects, Total Matches, Avg Match Score, Hire Rate
- Role breakdown: one `MetricCard` per role from `users.role.value_counts()`

### `/overview`

- User growth area/line chart (monthly registrations by role)
- 2-col: User status pie chart + Users by role bar chart
- Talent geographic distribution stacked bar chart
- Platform health `DataTable` (6 rows: users, projects, matches, reviews, directors, KOLs)

### `/projects`

- Sidebar: `FilterBar` with Type / Status / Location selects
- 4 `MetricCard`: Total, Avg Budget Range, Open count, In Progress count
- 2-col: Budget distribution box chart + Status funnel bar chart
- Timeline Gantt (horizontal bar chart: project × [start, end])
- `DataTable`: title, company, type, budget min/max, status, location, dates

### `/talent`

- `Tabs`: Directors | KOLs
- **Directors tab:**
  - 4 `MetricCard`: count, avg experience, avg day rate, availability %
  - 2-col: Experience × Day Rate scatter (bubble size = portfolio count) + Location bar
  - `DataTable`: name, experience, day rate, location, availability
- **KOLs tab:**
  - 4 `MetricCard`: count, avg followers, avg engagement, avg booking fee
  - Value quadrant scatter (followers × engagement, color = niche)
  - 2-col: By platform bar + Niche pie
  - `DataTable`: stage name, niche, demographic, booking fee, total followers, avg engagement

### `/matching`

- Sidebar: `FilterBar` with Initiated By / Match Status / Talent Type / Project Type
- 4 `MetricCard`: Total Matches, Hire Rate, Avg Match Score, Avg Proposed Fee
- 2-col: Match funnel chart + Source comparison grouped bar
- 2-col: Score histogram + Fee × Score scatter
- `DataTable`: talent name, project, type, initiated by, score, fee, status

### `/roi`

- Info callout: "ROI estimates are simulated for POC"
- Sidebar: `FilterBar` with Talent Type / Project Type / Initiated By / Match Status
- 4 `MetricCard`: Avg ROI%, Median ROI%, Best ROI (with name), Worst ROI (with name)
- 2-col: ROI by matching type bar + ROI by project type bar
- ROI by talent type bar + 2 metric cards (median + count per type)
- 2-col: Cost efficiency scatter (fee × ROI, size = match score) + Quality × ROI scatter with trendline
- 2-col: Top 10 ROI `DataTable` + Bottom 10 ROI `DataTable`
- Conditional warning banners: negative ROI count + extreme ROI count

### `/match-engine`

- `BriefForm` with fields:
  - Brand (text input)
  - Industry (select: FMCG, F&B, Fashion, Banking, Insurance, Healthcare, Tech, Beauty, Automotive, Entertainment)
  - Campaign type (select: TVC, digital_content, social_media_content, music_video, corporate_video)
  - Tone (select: emotional_storytelling, cinematic, comedic, bold_graphic, documentary_realism, premium_brand)
  - Budget USD (number input + `Slider` $1K–$250K)
  - Timeline weeks (`Slider` 2–12)
  - Description (`Textarea`, min 30 chars to enable submit)
  - Top N (`Slider` 3–10, default 5)
  - Submit `Button`: disabled when invalid or loading, shows spinner
- Results: list of `CandidateCard`
  - Rank + Name + score badge (monochrome, size varies with score)
  - Availability `Badge` (Available/Booked + date)
  - `ScoreBreakdown`: 7 labeled horizontal bars (Vietnamese labels)
  - Explanation text
  - Notable brands as `Badge` chips
- Response time + total candidates considered shown above results
- Error and loading states handled

---

## API Routes

| Route | Method | Returns | CSV source |
|---|---|---|---|
| `/api/analytics/users` | GET | `User[]` | `01_users.csv` |
| `/api/analytics/projects` | GET | `Project[]` | `09_projects.csv` + `02_company_profiles.csv` |
| `/api/analytics/matches` | GET | `Match[]` | `11_matches_applications.csv` |
| `/api/analytics/directors` | GET | `Director[]` | `03_director_profiles.csv` |
| `/api/analytics/kols` | GET | `KolProfile[]` | `04_kol_profiles.csv` |
| `/api/analytics/social-metrics` | GET | `SocialMetric[]` | `05_kol_social_metrics.csv` |
| `/api/analytics/portfolios` | GET | `Portfolio[]` | `06_portfolios.csv` |
| `/api/analytics/reviews` | GET | `Review[]` | `12_reviews.csv` |
| `/api/analytics/roi` | GET | `RoiRow[]` | `roi_analysis.csv` |
| `/api/match` | POST | `MatchResponse` | Proxy → FastAPI `:8000/match` |

All GET routes accept optional `?page=&size=` params (ignored for CSV, used when backend swap happens).

---

## Migration

1. New Next.js app lives in `frontend-next/` at repo root
2. Old `frontend/` (vanilla JS) and `app.py` / `pages/` remain until new app is verified
3. After verification: delete `frontend/`, `app.py`, `pages/`, `utils/` (Streamlit utils)
4. `dataset/` stays at root — API routes reference `process.cwd() + '/dataset'`

---

## Out of Scope

- Authentication
- Admin panel for adding/editing profiles
- Real-time data updates
- Mobile-specific optimizations (responsive layout only)
- Export to PDF
