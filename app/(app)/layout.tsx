import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, firms(name)')
    .single()

  const firmName = (profile?.firms as any)?.name ?? 'Your Firm'

  return (
    <div className="flex h-screen bg-gray-50">
      <nav className="w-52 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-4 py-5 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-0.5">
            Capital Allocation OS
          </p>
          <p className="text-sm font-semibold text-gray-800 truncate">{firmName}</p>
        </div>

        <div className="flex-1 px-3 py-4 space-y-0.5">
          <Link href="/pipeline" className="block px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors">Pipeline</Link>
          <Link href="/graveyard" className="block px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors">Graveyard</Link>
          <Link href="/settings" className="block px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors">Settings</Link>
        </div>

        <div className="px-4 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 truncate">{profile?.full_name ?? user.email}</p>
          <form action="/auth/signout" method="post">
            <button type="submit" className="text-xs text-gray-400 hover:text-gray-600 mt-1">
              Sign out
            </button>
          </form>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
