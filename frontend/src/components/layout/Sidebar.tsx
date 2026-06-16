'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Separator } from '@/components/ui/separator'

const MAIN_ITEMS = [
  { label: 'Home', href: '/' },
  { label: 'Overview', href: '/overview' },
  { label: 'Projects', href: '/projects' },
  { label: 'ROI Analysis', href: '/roi' },
]

const DIRECTOR_ITEMS = [
  { label: 'Director Pool', href: '/directors' },
  { label: 'Matching', href: '/directors/matching' },
  { label: 'Match Engine', href: '/directors/engine' },
]

const KOL_ITEMS = [
  { label: 'KOL Pool', href: '/kols' },
  { label: 'Matching', href: '/kols/matching' },
  { label: 'Match Engine', href: '/kols/engine' },
]

const COLLAPSE_KEY = 'sidebar-collapsed'

function NavLink({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const active = pathname === href
  return (
    <Link
      href={href}
      className={`px-3 py-2 rounded text-sm transition-colors ${
        active ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
      }`}
    >
      {label}
    </Link>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  // Restore saved collapse state on mount.
  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1')
  }, [])

  function toggle() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
  }

  return (
    <aside
      className={`${
        collapsed ? 'w-16 px-2' : 'w-56 px-4'
      } h-screen flex-shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col py-6 overflow-y-auto transition-all duration-200`}
    >
      <div className={`mb-6 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <div>
            <span className="text-xs font-semibold tracking-widest text-gray-400 uppercase">PennyWorth</span>
            <h1 className="text-lg font-bold leading-tight">KOL Matching</h1>
          </div>
        )}
        <button
          onClick={toggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          {collapsed ? '»' : '«'}
        </button>
      </div>

      {collapsed ? (
        <div className="flex justify-center text-sm font-bold text-primary">PW</div>
      ) : (
        <>
          <Separator className="bg-sidebar-border mb-4" />

          <nav className="flex flex-col gap-1 flex-1">
            {MAIN_ITEMS.map(item => (
              <NavLink key={item.href} href={item.href} label={item.label} pathname={pathname} />
            ))}

            <Separator className="bg-sidebar-border my-3" />

            <span className="px-3 text-xs font-semibold tracking-widest text-gray-500 uppercase mb-1">
              Archived
            </span>
            {DIRECTOR_ITEMS.map(item => (
              <NavLink key={item.href} href={item.href} label={item.label} pathname={pathname} />
            ))}

            <Separator className="bg-sidebar-border my-3" />

            <span className="px-3 text-xs font-semibold tracking-widest text-gray-500 uppercase mb-1">
              KOLs
            </span>
            {KOL_ITEMS.map(item => (
              <NavLink key={item.href} href={item.href} label={item.label} pathname={pathname} />
            ))}
          </nav>
        </>
      )}
    </aside>
  )
}
