import Sidebar from '@/components/layout/Sidebar'

// App-shell layout: sidebar + scrollable main. Marketing routes (e.g. /landing)
// live outside this group, so they render full-bleed without the sidebar.
export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Decorative glowy blobs — slow-drifting fades behind everything. */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="bg-blob bg-blob-cyan" style={{ top: '-10%', left: '8%' }} />
        <div className="bg-blob bg-blob-red" style={{ top: '40%', right: '0%' }} />
        <div className="bg-blob bg-blob-purple" style={{ bottom: '-12%', left: '30%' }} />
      </div>
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  )
}
