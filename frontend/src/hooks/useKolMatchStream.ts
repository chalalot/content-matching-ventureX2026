import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  KolBriefRequest,
  KolMatchResponse,
  KolCandidateResult,
  PipelineStage,
} from '@/lib/data/types'

export type StreamStatus = 'idle' | 'connecting' | 'streaming' | 'done' | 'error'

/**
 * Resolve the backend WebSocket origin. WebSockets can't be proxied through the
 * Next.js /api route handlers (those are for HTTP), so the browser connects
 * directly to the backend. Set NEXT_PUBLIC_BACKEND_WS_URL (e.g. ws://localhost:8000)
 * in production; in dev we fall back to the backend's default :8000.
 */
function wsBaseUrl(): string {
  const env = process.env.NEXT_PUBLIC_BACKEND_WS_URL
  if (env) return env.replace(/\/$/, '')
  if (typeof window !== 'undefined') {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${proto}//${window.location.hostname}:8000`
  }
  return 'ws://localhost:8000'
}

export interface KolMatchStream {
  status: StreamStatus
  stages: PipelineStage[]
  candidates: KolCandidateResult[]
  result: KolMatchResponse | null
  error: string | null
  meta: { total: number; topN: number } | null
  run: (brief: KolBriefRequest) => void
  reset: () => void
}

/**
 * Streams a KOL match over the backend WebSocket, surfacing each layer's results
 * as they arrive: `stage` events (Layer 1 retrieval, Layer 2 scoring) populate
 * `stages`; `candidate` events (Layer 3) push into `candidates`; `complete` sets
 * the final `result` (which also carries the full `pipeline`).
 */
export function useKolMatchStream(): KolMatchStream {
  const [status, setStatus] = useState<StreamStatus>('idle')
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [candidates, setCandidates] = useState<KolCandidateResult[]>([])
  const [result, setResult] = useState<KolMatchResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [meta, setMeta] = useState<{ total: number; topN: number } | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  const cleanup = useCallback(() => {
    const ws = wsRef.current
    if (ws) {
      ws.onopen = null
      ws.onmessage = null
      ws.onerror = null
      ws.onclose = null
      try { ws.close() } catch { /* already closed */ }
      wsRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    cleanup()
    setStatus('idle')
    setStages([])
    setCandidates([])
    setResult(null)
    setError(null)
    setMeta(null)
  }, [cleanup])

  const run = useCallback((brief: KolBriefRequest) => {
    cleanup()
    setStatus('connecting')
    setStages([])
    setCandidates([])
    setResult(null)
    setError(null)
    setMeta(null)

    let ws: WebSocket
    try {
      ws = new WebSocket(`${wsBaseUrl()}/ws/match/kol`)
    } catch {
      setError('Could not open a connection to the matching service.')
      setStatus('error')
      return
    }
    wsRef.current = ws

    ws.onopen = () => {
      setStatus('streaming')
      ws.send(JSON.stringify(brief))
    }

    ws.onmessage = (ev: MessageEvent) => {
      let msg: {
        type: string
        data?: unknown
        message?: string
        total_candidates_considered?: number
        top_n?: number
      }
      try {
        msg = JSON.parse(ev.data)
      } catch {
        return
      }
      switch (msg.type) {
        case 'stage':
          setStages(prev => [...prev, msg.data as PipelineStage])
          break
        case 'init':
          setMeta({ total: msg.total_candidates_considered ?? 0, topN: msg.top_n ?? 0 })
          break
        case 'candidate':
          setCandidates(prev => [...prev, msg.data as KolCandidateResult])
          break
        case 'complete':
          setResult(msg.data as KolMatchResponse)
          setStatus('done')
          cleanup()
          break
        case 'error':
          setError(msg.message ?? 'The matching service returned an error.')
          setStatus('error')
          cleanup()
          break
      }
    }

    ws.onerror = () => {
      setError('WebSocket connection failed. Is the backend running (and NEXT_PUBLIC_BACKEND_WS_URL set in production)?')
      setStatus('error')
    }

    ws.onclose = () => {
      // Only an unexpected close (server dropped before 'complete') is an error;
      // normal completion nulls this handler in cleanup() before closing.
      setStatus(prev => (prev === 'streaming' || prev === 'connecting' ? 'error' : prev))
    }
  }, [cleanup])

  // Close the socket if the component unmounts mid-stream.
  useEffect(() => cleanup, [cleanup])

  return { status, stages, candidates, result, error, meta, run, reset }
}
