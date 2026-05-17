'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Separator } from '@/components/ui/separator'

const NAV_ITEMS = [
  { label: 'Home', href: '/' },
  { label: 'Overview', href: '/overview' },
  { label: 'Projects', href: '/projects' },
  { label: 'Talent Pool', href: '/talent' },
  { label: 'Matching', href: '/matching' },
  { label: 'ROI Analysis', href: '/roi' },
]

const ENGINE_ITEMS = [
  { label: 'Match Engine', href: '/match-engine' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 h-screen flex-shrink-0 bg-black text-white flex flex-col py-6 px-4 overflow-y-auto">
      <div className="mb-6">
        <span className="text-xs font-semibold tracking-widest text-gray-400 uppercase">ALIEN</span>
        <h1 className="text-lg font-bold leading-tight">Platform</h1>
      </div>

      <Separator className="bg-gray-700 mb-4" />

      <nav className="flex flex-col gap-1 flex-1">
        {NAV_ITEMS.map(item => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 rounded text-sm transition-colors ${
                active
                  ? 'bg-white text-black font-semibold'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              {item.label}
            </Link>
          )
        })}

        <Separator className="bg-gray-700 my-3" />

        {ENGINE_ITEMS.map(item => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 rounded text-sm transition-colors ${
                active
                  ? 'bg-white text-black font-semibold'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
