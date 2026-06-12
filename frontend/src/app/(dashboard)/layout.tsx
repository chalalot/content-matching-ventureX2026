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
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-background p-6">{children}</main>
    </div>
  )
}
