import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getInternalContext, can } from '@/lib/internal/auth'

// Internal team panel. Non-members get a 404 — the panel should not
// advertise its existence to customers or logged-out visitors.
export default async function InternalLayout({ children }: { children: React.ReactNode }) {
  const context = await getInternalContext()
  if (!context) notFound()

  const nav = [
    { href: '/internal', label: 'Ops', show: can(context, 'ops') },
    { href: '/internal/team', label: 'Team', show: can(context, 'team') },
    { href: '/internal/dev', label: 'Dev', show: can(context, 'dev') },
    { href: '/internal/marketing', label: 'Marketing', show: can(context, 'marketing') },
    { href: '/internal/ownership', label: 'Ownership', show: can(context, 'ownership') },
  ].filter((item) => item.show)

  return (
    <div className="min-h-screen" style={{ background: '#0c0c14', color: '#e7e7ee' }}>
      <header className="border-b" style={{ borderColor: 'rgba(112,112,125,0.2)' }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-6">
            <p className="text-sm font-bold" style={{ color: '#f4f4f8' }}>
              Dealstash <span className="font-normal" style={{ color: '#8b8b9a' }}>/ internal</span>
            </p>
            <nav className="flex gap-4">
              {nav.map((item) => (
                <Link key={item.href} href={item.href} className="text-sm hover:opacity-70" style={{ color: '#c3c3d0' }}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <p className="text-xs" style={{ color: '#8b8b9a' }}>
            {context.fullName} · {context.role}
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  )
}
