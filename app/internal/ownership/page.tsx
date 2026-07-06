import { notFound } from 'next/navigation'
import { getInternalContext, can } from '@/lib/internal/auth'
import OwnershipBoard from '@/components/internal/OwnershipBoard'

export default async function InternalOwnershipPage() {
  const context = await getInternalContext()
  if (!context || !can(context, 'ownership')) notFound()

  const [{ data: equity }, { data: decisions }] = await Promise.all([
    context.supabase.from('equity_reference').select('*').order('percentage', { ascending: false }),
    context.supabase
      .from('decision_log')
      .select('*, decided:internal_users(full_name)')
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  return (
    <OwnershipBoard
      equity={(equity ?? []) as never[]}
      decisions={(decisions ?? []) as never[]}
      canEditEquity={can(context, 'ownership', 'full')}
      canLogDecisions={can(context, 'ownership', 'write')}
    />
  )
}
