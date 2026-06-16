'use client'

import { useEffect, useRef, useState } from 'react'
import type { PipelineStage } from '@/lib/data/types'

// Each layer dwells at least this long so the animation is watchable, even
// when the backend returns Layer 1/2 almost instantly. A little random jitter
// is added on top so the pacing never feels mechanical.
const MIN_MS = 4500
const JITTER_MS = 2000

const SVG_NS = 'http://www.w3.org/2000/svg'
const COLOR = ['#25F4EE', '#b69bff', '#37d399'] // l1 cyan · l2 purple · l3 green
const STEP_LABELS = ['Retrieval', 'Scoring', 'AI Reasoning']

function el(name: string, attrs: Record<string, string | number>) {
  const node = document.createElementNS(SVG_NS, name)
  for (const k in attrs) node.setAttribute(k, String(attrs[k]))
  return node
}

/** Borderless neon carousel that walks the viewer through Layer 1 → 2 → 3. */
export default function KolPipelineCarousel({
  stages,
  autoplay,
  loading,
  onComplete,
}: {
  stages: PipelineStage[]
  autoplay: boolean
  loading: boolean
  onComplete?: () => void
}) {
  const maxIdx = Math.max(0, Math.min(2, stages.length - 1))
  const [active, setActive] = useState(autoplay ? 0 : maxIdx)
  const [auto, setAuto] = useState(autoplay)
  const startRef = useRef(0)
  const dwellRef = useRef(MIN_MS)
  // Whatever the active slide scheduled; called when we leave it.
  const cancelRef = useRef<() => void>(() => {})
  // Layer 3 keeps "researching" as long as the backend is still streaming.
  const searchingRef = useRef(loading)
  useEffect(() => {
    searchingRef.current = loading
  }, [loading])

  // ── Layer 1: semantic retrieval (vector-space search) ──
  const queryNodeRef = useRef<SVGCircleElement>(null)
  const retrievalDotsRef = useRef<SVGGElement>(null)
  const retrievalLinksRef = useRef<SVGGElement>(null)
  const sonarRef = useRef<SVGGElement>(null)
  // ── Layer 2: scoring radar → funnel ──
  const radarWrapRef = useRef<HTMLDivElement>(null)
  const funnelWrapRef = useRef<HTMLDivElement>(null)
  const spokesRef = useRef<SVGGElement>(null)
  const polyRef = useRef<SVGPolygonElement>(null)
  const scoreRef = useRef<HTMLParagraphElement>(null)
  const funnelPathRef = useRef<SVGPathElement>(null)
  const funnelOrbsRef = useRef<SVGGElement>(null)
  // ── Layer 3: writing / research ──
  const docPathRef = useRef<SVGPathElement>(null)
  const linesRef = useRef<SVGGElement>(null)
  const nibRef = useRef<SVGGElement>(null)
  const webRef = useRef<SVGGElement>(null)
  // ── Done ──
  const doneCircleRef = useRef<SVGCircleElement>(null)
  const doneTickRef = useRef<SVGPathElement>(null)

  const byLayer = (n: number) => stages.find(s => s.layer === n)
  const l1 = byLayer(1)
  const l2 = byLayer(2)
  const l3 = byLayer(3)
  const num = (v?: number) => (v == null ? '…' : v.toLocaleString())

  // Score target for the radar caption: best candidate score, else a default.
  const l2Top = l2?.candidates.reduce((m, c) => Math.max(m, c.metric ?? 0), 0) ?? 0
  const scoreTarget = l2Top > 0 ? Math.round(l2Top) : 90
  const l3Count = l3?.out_count ?? l3?.candidates.length ?? l2?.out_count ?? 0

  /* ─────────────────── per-slide animations ─────────────────── */

  // L1 — a query node sweeps a sonar over a field of KOL points; the nearest
  // (most semantically similar) light up and link back. No filtering — retrieval.
  function runRetrieval() {
    const dotsG = retrievalDotsRef.current
    const linksG = retrievalLinksRef.current
    const sonarG = sonarRef.current
    if (!dotsG || !linksG || !sonarG) return
    dotsG.replaceChildren()
    linksG.replaceChildren()
    sonarG.replaceChildren()

    const timeouts: ReturnType<typeof setTimeout>[] = []
    let cancelled = false
    cancelRef.current = () => {
      cancelled = true
      timeouts.forEach(clearTimeout)
    }
    const later = (fn: () => void, ms: number) => timeouts.push(setTimeout(fn, ms))

    const dots: { x: number; y: number; rad: number; node: SVGElement }[] = []
    for (let i = 0; i < 26; i++) {
      const ang = Math.random() * Math.PI * 2
      const rad = 40 + Math.random() * 112
      const x = Math.cos(ang) * rad
      const y = Math.sin(ang) * rad
      const c = el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 3.5, fill: COLOR[0], opacity: 0.2 })
      dotsG.appendChild(c)
      dots.push({ x, y, rad, node: c })
    }
    const matches = [...dots].sort((a, b) => a.rad - b.rad).slice(0, 8)

    const emitRing = () => {
      if (cancelled) return
      const ring = el('circle', { cx: 0, cy: 0, r: 6, fill: 'none', stroke: COLOR[0], 'stroke-width': 1.5 })
      ring.setAttribute('class', 'pl-glow-l1')
      sonarG.appendChild(ring)
      const a = ring.animate([{ r: 6, opacity: 0.7 }, { r: 155, opacity: 0 }], {
        duration: 1700,
        easing: 'ease-out',
        fill: 'forwards',
      })
      a.onfinish = () => ring.remove()
    }
    emitRing()
    ;[600, 1200].forEach(t => later(emitRing, t))

    matches.forEach(m => {
      later(() => {
        m.node.setAttribute('r', '5.5')
        m.node.animate([{ opacity: 0.2 }, { opacity: 1 }], { duration: 400, fill: 'forwards' })
        const ln = el('line', {
          x1: 0,
          y1: 0,
          x2: m.x.toFixed(1),
          y2: m.y.toFixed(1),
          stroke: COLOR[0],
          'stroke-width': 1,
          'stroke-dasharray': '2 3',
        })
        ln.setAttribute('class', 'pl-glow-l1')
        linksG.appendChild(ln)
        ln.animate([{ opacity: 0 }, { opacity: 0.55 }], { duration: 400, fill: 'forwards' })
      }, (m.rad / 155) * 1700)
    })
  }

  // L2 — radar scores the candidates (7 criteria), then they funnel down to top-N.
  function runScoring() {
    const radarWrap = radarWrapRef.current
    const funnelWrap = funnelWrapRef.current
    const timeouts: ReturnType<typeof setTimeout>[] = []
    let cancelled = false
    cancelRef.current = () => {
      cancelled = true
      timeouts.forEach(clearTimeout)
    }

    // phase 1 — radar
    if (radarWrap) radarWrap.style.opacity = '1'
    if (funnelWrap) funnelWrap.style.opacity = '0'
    const spokes = spokesRef.current
    const poly = polyRef.current
    if (spokes && poly) {
      const N = 7
      const R = 120
      spokes.replaceChildren()
      const pts: { a: number; r: number }[] = []
      for (let i = 0; i < N; i++) {
        const a = (Math.PI * 2 * i) / N - Math.PI / 2
        spokes.appendChild(el('line', { x1: 0, y1: 0, x2: Math.cos(a) * R, y2: Math.sin(a) * R }))
        pts.push({ a, r: 30 + Math.random() * 85 })
      }
      const dur = 1500
      const t0 = performance.now()
      const frame = (now: number) => {
        if (cancelled) return
        const t = Math.min(1, (now - t0) / dur)
        const e = 1 - Math.pow(1 - t, 3)
        poly.setAttribute(
          'points',
          pts.map(p => `${(Math.cos(p.a) * p.r * e).toFixed(1)},${(Math.sin(p.a) * p.r * e).toFixed(1)}`).join(' '),
        )
        if (scoreRef.current) scoreRef.current.textContent = `tính điểm: ${Math.round(e * scoreTarget)} / 100`
        if (t < 1) requestAnimationFrame(frame)
      }
      requestAnimationFrame(frame)
    }

    // phase 2 — cross-fade to the funnel and drop the candidates through
    timeouts.push(
      setTimeout(() => {
        if (cancelled) return
        if (radarWrap) radarWrap.style.opacity = '0'
        if (funnelWrap) funnelWrap.style.opacity = '1'
        const path = funnelPathRef.current
        const g = funnelOrbsRef.current
        if (path) {
          path.style.animation = 'none'
          void path.getBoundingClientRect()
          path.style.animation = 'pl-draw-in 0.9s ease forwards'
        }
        if (!g) return
        g.replaceChildren()
        let survived = 0
        for (let i = 0; i < 20; i++) {
          const orb = el('circle', { r: 7, fill: COLOR[1] })
          orb.setAttribute('class', 'pl-glow-l2')
          g.appendChild(orb)
          const startX = 80 + Math.random() * 200
          const pass = Math.random() < 0.3 && survived < 7
          if (pass) survived++
          orb.animate(
            [
              { transform: `translate(${startX}px,-20px)`, opacity: 0 },
              { transform: `translate(${startX}px,60px)`, opacity: 1, offset: 0.2 },
              { transform: `translate(180px,200px)`, opacity: 1, offset: 0.6 },
              pass
                ? { transform: `translate(180px,300px)`, opacity: 1 }
                : { transform: `translate(180px,200px) scale(.2)`, opacity: 0 },
            ],
            { duration: pass ? 2200 : 1500, delay: i * 110, easing: 'cubic-bezier(.5,0,.7,1)', fill: 'forwards' },
          )
        }
      }, 2000),
    )
  }

  // L3 — pen writes a report, web nodes pop in. Loops while the search runs.
  function runWriting() {
    const path = docPathRef.current
    if (path) {
      path.style.animation = 'none'
      void path.getBoundingClientRect()
      path.style.animation = 'pl-draw-in 1.1s ease forwards'
    }
    const lines = linesRef.current
    const nib = nibRef.current
    const web = webRef.current
    if (!lines || !nib || !web) return

    let cancelled = false
    const timeouts: ReturnType<typeof setTimeout>[] = []
    cancelRef.current = () => {
      cancelled = true
      timeouts.forEach(clearTimeout)
    }
    const later = (fn: () => void, ms: number) => timeouts.push(setTimeout(fn, ms))

    const rows = [
      [140, 90, 255],
      [140, 120, 235],
      [140, 150, 250],
      [140, 180, 210],
      [140, 210, 240],
    ]
    const onePass = () => {
      if (cancelled) return
      lines.replaceChildren()
      web.replaceChildren()
      let i = 0
      const writeRow = () => {
        if (cancelled) return
        if (i >= rows.length) {
          if (searchingRef.current) later(onePass, 900)
          return
        }
        const [x, y, x2] = rows[i]
        const ln = el('line', { x1: x, y1: y, x2: x, y2: y, stroke: COLOR[2] })
        lines.appendChild(ln)
        const dur = 600
        const t0 = performance.now()
        const fr = (now: number) => {
          if (cancelled) return
          const t = Math.min(1, (now - t0) / dur)
          const cx = x + (x2 - x) * t
          ln.setAttribute('x2', String(cx))
          nib.setAttribute('transform', `translate(${cx - 4},${y - 7})`)
          if (t < 1) requestAnimationFrame(fr)
          else {
            i++
            later(writeRow, 180)
          }
        }
        requestAnimationFrame(fr)
      }
      writeRow()
      ;[
        [300, 80],
        [330, 150],
        [300, 210],
      ].forEach((p, k) => {
        const c = el('circle', { cx: p[0], cy: p[1], r: 14 })
        c.setAttribute('opacity', '0')
        web.appendChild(c)
        const ln = el('line', { x1: 280, y1: 150, x2: p[0], y2: p[1], 'stroke-dasharray': '3 4' })
        ln.setAttribute('opacity', '0')
        web.appendChild(ln)
        later(() => {
          c.animate([{ opacity: 0, transform: 'scale(.3)' }, { opacity: 0.85, transform: 'scale(1)' }], {
            duration: 500,
            fill: 'forwards',
          })
          ln.animate([{ opacity: 0 }, { opacity: 0.5 }], { duration: 500, fill: 'forwards' })
        }, 700 + k * 500)
      })
    }
    onePass()
  }

  // Done — a neon checkmark draws itself in.
  function runDone() {
    cancelRef.current = () => {}
    const circle = doneCircleRef.current
    const tick = doneTickRef.current
    if (circle) {
      circle.style.animation = 'none'
      void circle.getBoundingClientRect()
      circle.style.animation = 'pl-draw-in 0.6s ease forwards'
    }
    if (tick) {
      tick.style.animation = 'none'
      void tick.getBoundingClientRect()
      tick.style.animation = 'pl-draw-in 0.4s ease 0.5s forwards'
    }
  }

  /* ─────────────────── timing / control ─────────────────── */

  // Play the active slide's animation whenever it changes (auto or manual).
  useEffect(() => {
    startRef.current = Date.now()
    dwellRef.current = MIN_MS + Math.random() * JITTER_MS
    cancelRef.current = () => {}
    const run = [runRetrieval, runScoring, runWriting, runDone][active]
    run?.()
    return () => cancelRef.current()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  // Auto-advance. Layer 1 → 2 waits for Layer 2's data (it's fast). Layer 2 → 3
  // advances on the dwell timer ALONE — Layer 3's web search is slow, so we slide
  // to it and play its animation while the results are still coming in (never
  // freezing on Layer 2). Each dwell has a little random jitter.
  useEffect(() => {
    if (!auto || active >= 2) return
    if (active === 0 && !stages.some(s => s.layer === 2)) return // wait for scoring data
    const wait = Math.max(0, dwellRef.current - (Date.now() - startRef.current))
    const t = setTimeout(() => setActive(l => Math.min(2, l + 1)), wait)
    return () => clearTimeout(t)
  }, [auto, active, stages])

  // When the backend finishes streaming (loading: true → false) while we're on
  // the Layer-3 slide and still auto-driving, slide to the "done" frame.
  const wasLoadingRef = useRef(loading)
  useEffect(() => {
    const was = wasLoadingRef.current
    wasLoadingRef.current = loading
    if (!(was && !loading && auto)) return
    // Let Layer 3 breathe a moment even if the search finished fast.
    const since = Date.now() - startRef.current
    const wait = active === 2 ? Math.max(0, 1800 - since) : 0
    const t = setTimeout(() => setActive(3), wait)
    return () => clearTimeout(t)
  }, [loading, auto])

  // On the done frame: let it settle, then scroll the user down to the results.
  useEffect(() => {
    if (active !== 3) return
    const t = setTimeout(() => onComplete?.(), 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  // Manual jump — stops the auto-advance, replays the chosen slide.
  const navTo = (n: number) => {
    if (n < 0 || n > 3) return
    setAuto(false)
    setActive(n)
  }

  const accent = COLOR[Math.min(active, 2)]

  return (
    <div className="select-none">
      {/* stepper — steps light up cumulatively as we progress */}
      <div className="mb-1.5 flex gap-6">
        {STEP_LABELS.map((label, i) => {
          const lit = i <= Math.min(active, 2)
          return (
            <button
              key={label}
              type="button"
              onClick={() => navTo(i)}
              className="flex flex-1 items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-wider transition-all"
              style={{
                color: lit ? COLOR[i] : '#3a3f45',
                textShadow: lit ? `0 0 12px ${COLOR[i]}` : 'none',
              }}
            >
              <span
                className="flex h-[18px] w-[18px] items-center justify-center rounded-full border-[1.5px] text-[9px]"
                style={{ borderColor: 'currentColor' }}
              >
                {i + 1}
              </span>
              {label}
            </button>
          )
        })}
      </div>
      <div className="mb-6 h-0.5 overflow-hidden rounded-full bg-[#16181c]">
        <div
          key={active /* restart the fill each layer */}
          className="h-full rounded-full"
          style={{
            background: accent,
            boxShadow: `0 0 10px ${accent}`,
            width: '100%',
            animation: auto && active < 2 ? `pl-fill ${MIN_MS}ms linear forwards` : 'none',
          }}
        />
      </div>

      {/* borderless viewport — top/bottom fade so the glow melts into the bg */}
      <div
        className="relative h-[400px] overflow-hidden"
        style={{
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, #000 14%, #000 86%, transparent 100%)',
          maskImage: 'linear-gradient(to bottom, transparent 0, #000 14%, #000 86%, transparent 100%)',
        }}
      >
        {/* edge nav — bare neon chevrons, blend into bg */}
        <button
          type="button"
          onClick={() => navTo(active - 1)}
          aria-label="Lớp trước"
          disabled={active === 0}
          className="absolute left-0 top-1/2 z-10 flex h-[120px] w-14 -translate-y-1/2 items-center justify-center bg-transparent transition-opacity disabled:pointer-events-none disabled:opacity-0"
          style={{ color: '#4a4f55' }}
          onMouseEnter={e => (e.currentTarget.style.color = accent)}
          onMouseLeave={e => (e.currentTarget.style.color = '#4a4f55')}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 5 8 12 15 19" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => navTo(active + 1)}
          aria-label="Lớp sau"
          disabled={active === 3 || (active === 2 && loading)}
          className="absolute right-0 top-1/2 z-10 flex h-[120px] w-14 -translate-y-1/2 items-center justify-center bg-transparent transition-opacity disabled:pointer-events-none disabled:opacity-0"
          style={{ color: '#4a4f55' }}
          onMouseEnter={e => (e.currentTarget.style.color = accent)}
          onMouseLeave={e => (e.currentTarget.style.color = '#4a4f55')}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 5 16 12 9 19" />
          </svg>
        </button>

        <div
          className="flex h-full w-[400%] transition-transform duration-700 ease-[cubic-bezier(.7,0,.2,1)]"
          style={{ transform: `translateX(-${active * 25}%)` }}
        >
          {/* ── LAYER 1: semantic retrieval ── */}
          <section className="relative flex h-full w-1/4 flex-col items-center justify-center text-center">
            <div className="pl-halo absolute h-[480px] w-[480px] rounded-full" style={{ background: COLOR[0] }} />
            <svg width="340" height="340" viewBox="-170 -170 340 340" className="overflow-visible">
              <g stroke={COLOR[0]} fill="none" opacity={0.12}>
                <circle r="55" />
                <circle r="110" />
                <circle r="155" />
              </g>
              <g ref={sonarRef} />
              <g ref={retrievalLinksRef} />
              <g ref={retrievalDotsRef} />
              <circle ref={queryNodeRef} className="pl-glow-l1 status-pulse" cx="0" cy="0" r="9" fill={COLOR[0]} />
            </svg>
          </section>

          {/* ── LAYER 2: scoring radar → funnel ── */}
          <section className="relative flex h-full w-1/4 flex-col items-center justify-center text-center">
            <div className="pl-halo absolute h-[480px] w-[480px] rounded-full" style={{ background: COLOR[1] }} />
            {/* phase 1 — radar */}
            <div ref={radarWrapRef} className="absolute inset-0 flex items-center justify-center transition-opacity duration-500">
              <svg width="320" height="320" viewBox="-160 -160 320 320" className="overflow-visible">
                <g stroke={COLOR[1]} fill="none" opacity={0.18}>
                  <circle r="40" />
                  <circle r="80" />
                  <circle r="120" />
                </g>
                <g ref={spokesRef} stroke={COLOR[1]} opacity={0.18} />
                <line x1="0" y1="0" x2="0" y2="-130" stroke={COLOR[1]} strokeWidth={2} className="pl-glow-l2 pl-spin" />
                <polygon ref={polyRef} className="pl-glow-l2" fill="rgba(182,155,255,.12)" stroke={COLOR[1]} strokeWidth={2.5} points="" />
              </svg>
            </div>
            {/* phase 2 — funnel */}
            <div ref={funnelWrapRef} className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-500">
              <svg width="360" height="320" viewBox="0 0 360 320" className="overflow-visible">
                <defs>
                  <linearGradient id="plFunnelFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={COLOR[1]} />
                    <stop offset="1" stopColor="transparent" />
                  </linearGradient>
                </defs>
                <path
                  ref={funnelPathRef}
                  className="pl-glow-l2"
                  d="M60 70 L300 70 L210 210 L210 270 L150 270 L150 210 Z"
                  fill="none"
                  stroke={COLOR[1]}
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                />
                <path d="M60 70 L300 70 L210 210 L210 270 L150 270 L150 210 Z" fill="url(#plFunnelFill)" opacity={0.1} />
                <ellipse cx="180" cy="272" rx="26" ry="5" fill={COLOR[1]} className="pl-glow-l2" opacity={0.55} />
                <g ref={funnelOrbsRef} />
              </svg>
            </div>
          </section>

          {/* ── LAYER 3: neon writing / research ── */}
          <section className="relative flex h-full w-1/4 flex-col items-center justify-center text-center">
            <div className="pl-halo absolute h-[480px] w-[480px] rounded-full" style={{ background: COLOR[2] }} />
            <svg width="380" height="320" viewBox="0 0 380 320" className="overflow-visible">
              <path
                ref={docPathRef}
                className="pl-glow-l3"
                d="M120 40 H280 V250 H120 Z"
                fill="none"
                stroke={COLOR[2]}
                strokeWidth={2.5}
              />
              <g ref={linesRef} stroke={COLOR[2]} strokeWidth={3} strokeLinecap="round" />
              <g ref={nibRef} className="pl-glow-l3">
                <path d="M0 0 L10 4 L4 10 Z" fill={COLOR[2]} />
                <line x1="4" y1="7" x2="22" y2="28" stroke={COLOR[2]} strokeWidth={3} />
              </g>
              <g ref={webRef} className="pl-glow-l3" stroke={COLOR[2]} fill="none" opacity={0.8} />
            </svg>
          </section>

          {/* ── DONE: neon checkmark + scroll hint ── */}
          <section className="relative flex h-full w-1/4 flex-col items-center justify-center text-center">
            <div className="pl-halo absolute h-[480px] w-[480px] rounded-full" style={{ background: COLOR[2] }} />
            <svg width="220" height="220" viewBox="0 0 100 100" className="overflow-visible">
              <circle
                ref={doneCircleRef}
                className="pl-glow-l3"
                cx="50"
                cy="50"
                r="38"
                fill="none"
                stroke={COLOR[2]}
                strokeWidth={3}
                pathLength={1}
                style={{ strokeDasharray: 1, strokeDashoffset: 1 }}
              />
              <path
                ref={doneTickRef}
                className="pl-glow-l3"
                d="M32 51 L45 64 L70 38"
                fill="none"
                stroke={COLOR[2]}
                strokeWidth={4}
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                style={{ strokeDasharray: 1, strokeDashoffset: 1 }}
              />
            </svg>
          </section>
        </div>
      </div>

      {/* caption — lives below the faded viewport so the text stays crisp */}
      <div key={active} className="animate-in fade-in -mt-2 text-center duration-500">
        {active === 0 && (
          <>
            <p className="text-[clamp(22px,3vw,30px)] font-extrabold tracking-tight" style={{ color: COLOR[0] }}>
              Truy hồi {num(l1?.out_count)} KOL liên quan
            </p>
            <p className="mt-1.5 font-mono text-xs font-semibold text-muted-foreground">
              tìm trong {num(l1?.in_count)} KOL · vector ngữ nghĩa (all-MiniLM)
            </p>
          </>
        )}
        {active === 1 && (
          <>
            <p className="text-[clamp(22px,3vw,30px)] font-extrabold tracking-tight" style={{ color: COLOR[1] }}>
              Chấm điểm {num(l2?.in_count)} → Top {num(l2?.out_count)}
            </p>
            <p ref={scoreRef} className="mt-1.5 font-mono text-xs font-semibold text-muted-foreground">
              tính điểm: 0 / 100
            </p>
          </>
        )}
        {active === 2 && (
          <>
            <p className="text-[clamp(22px,3vw,30px)] font-extrabold tracking-tight" style={{ color: COLOR[2] }}>
              AI nghiên cứu {l3Count || '…'} KOL
            </p>
            <p className="mt-1.5 font-mono text-xs font-semibold text-muted-foreground">
              viết báo cáo + đối chiếu web…
            </p>
          </>
        )}
        {active === 3 && (
          <>
            <p className="text-[clamp(22px,3vw,30px)] font-extrabold tracking-tight" style={{ color: COLOR[2] }}>
              Hoàn tất · {l3Count || '…'} KOL phù hợp
            </p>
            <p className="mt-1.5 animate-pulse font-mono text-xs font-semibold text-muted-foreground">
              ↓ đang đưa bạn tới kết quả…
            </p>
          </>
        )}
      </div>
    </div>
  )
}
