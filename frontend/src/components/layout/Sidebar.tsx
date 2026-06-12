'use client'

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

  return (
    <aside className="w-56 h-screen flex-shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col py-6 px-4 overflow-y-auto">
      <div className="mb-6">
        <span className="text-xs font-semibold tracking-widest text-gray-400 uppercase">ALIEN</span>
        <h1 className="text-lg font-bold leading-tight">Platform</h1>
      </div>

      <Separator className="bg-sidebar-border mb-4" />

      <nav className="flex flex-col gap-1 flex-1">
        {MAIN_ITEMS.map(item => (
          <NavLink key={item.href} href={item.href} label={item.label} pathname={pathname} />
        ))}

        <Separator className="bg-sidebar-border my-3" />

        <span className="px-3 text-xs font-semibold tracking-widest text-gray-500 uppercase mb-1">
          Directors
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
    </aside>
  )
}
