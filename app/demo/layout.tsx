import Link from 'next/link'
import DemoBanner from '@/components/demo/DemoBanner'

const navLinks = [
  { href: '/demo',     label: 'Pipeline' },
  { href: '/signup',   label: 'Contacts ↗' },
  { href: '/signup',   label: 'Dashboard ↗' },
  { href: '/signup',   label: 'Settings ↗' },
]

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <DemoBanner />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav className="hidden md:flex w-52 flex-shrink-0 bg-white border-r border-gray-200 flex-col">
          <div className="px-4 py-5 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-0.5">Dealstash</p>
            <p className="text-sm font-semibold text-gray-800 truncate">Acme Capital</p>
          </div>

          <div className="flex-1 px-3 py-4 space-y-0.5">
            {navLinks.map(({ href, label }) => (
              <Link
                key={label}
                href={href}
                className="block px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>

          <div className="px-4 py-4 border-t border-gray-100">
            <p className="text-xs text-gray-400">demo@acmecapital.com</p>
            <Link href="/signup" className="text-xs text-blue-600 hover:underline mt-1 block">
              Create your account →
            </Link>
          </div>
        </nav>

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
