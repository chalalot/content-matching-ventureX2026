'use client'

import { useEffect, useState } from 'react'

// Filename extensions we'll look for, in priority order.
const EXTS = ['jpg', 'jpeg', 'png', 'webp']

// Slug a KOL name into a filename: strips Vietnamese diacritics, lowercases,
// hyphenates. "Đức Phúc" -> "duc-phuc", "Linh Chi" -> "linh-chi".
export function kolSlug(name: string): string {
  return name
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // drop combining accent marks
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function initials(name: string): string {
  const clean = name.replace(/^@/, '').trim()
  if (!clean) return '?'
  const parts = clean.split(/\s+/)
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : clean.slice(0, 2)).toUpperCase()
}

// Deterministic brand-color gradient per name — a nicer placeholder than a flat
// fill while real photos are still being collected. Literal classes for the scanner.
const PLACEHOLDER_GRADIENTS = [
  'from-l1/40 to-l2/40',
  'from-l2/40 to-primary/40',
  'from-l3/40 to-l1/40',
  'from-primary/40 to-l3/40',
  'from-l1/40 to-l3/40',
]

function placeholderGradient(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) % PLACEHOLDER_GRADIENTS.length
  return PLACEHOLDER_GRADIENTS[hash]
}

/**
 * KOL avatar that shows a real photo from /public/kol-images/{name-slug}.{ext}
 * when one exists, falling back to initials otherwise. We probe each extension
 * with an off-screen Image() so a missing file never flashes a broken-image icon.
 */
export default function KolAvatar({
  name,
  className = 'h-7 w-7 text-[10px]',
  rounded = 'rounded-full',
}: {
  name: string
  className?: string
  rounded?: string // override shape — 'rounded-none' for the rectangular gallery photo
}) {
  const slug = kolSlug(name)
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    setSrc(null)
    if (!slug) return
    let cancelled = false
    ;(async () => {
      for (const ext of EXTS) {
        const url = `/kol-images/${slug}.${ext}`
        const ok = await new Promise<boolean>(resolve => {
          const img = new Image()
          img.onload = () => resolve(true)
          img.onerror = () => resolve(false)
          img.src = url
        })
        if (cancelled) return
        if (ok) {
          setSrc(url)
          return
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug])

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden ${rounded} bg-muted bg-gradient-to-br font-bold ${placeholderGradient(name)} ${className}`}
    >
      {initials(name)}
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="absolute inset-0 h-full w-full object-cover" />
      )}
    </div>
  )
}
