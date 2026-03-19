import DemoBanner from '@/components/demo/DemoBanner'
import DemoSidebar from '@/components/demo/DemoSidebar'

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <DemoBanner />

      <div className="flex flex-1 overflow-hidden">
        <DemoSidebar />

        {/* pt-14 on mobile clears the fixed top bar (DemoBanner handled by flex layout) */}
        <main className="flex-1 overflow-auto md:pt-0 pt-14">
          {children}
        </main>
      </div>
    </div>
  )
}
