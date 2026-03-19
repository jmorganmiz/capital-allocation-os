import Link from 'next/link'
import DemoBanner from '@/components/demo/DemoBanner'
import DemoSidebar from '@/components/demo/DemoSidebar'

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <DemoBanner />

      <div className="flex flex-1 overflow-hidden">
        <DemoSidebar />

        {/* Mobile top bar */}
        <div className="md:hidden fixed top-10 left-0 right-0 z-40 bg-white border-b border-gray-200 flex items-center justify-between px-4 h-14">
          <p className="text-sm font-semibold text-gray-800">Acme Capital</p>
          <Link href="/signup" className="text-sm font-medium text-blue-600 hover:underline">
            Sign up free →
          </Link>
        </div>

        <main className="flex-1 overflow-auto md:pt-0 pt-24">
          {children}
        </main>
      </div>
    </div>
  )
}
