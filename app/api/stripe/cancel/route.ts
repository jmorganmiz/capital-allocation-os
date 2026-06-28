import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id, role, firms(stripe_subscription_id)')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Administrator access required' }, { status: 403 })
  }

  const firmRecord = (Array.isArray(profile.firms) ? profile.firms[0] : profile.firms) as {
    stripe_subscription_id?: string | null
  } | null
  const subscriptionId = firmRecord?.stripe_subscription_id ?? null

  if (!subscriptionId) {
    return NextResponse.json({ error: 'No active subscription found' }, { status: 400 })
  }

  const stripe = getStripe()

  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  })

  const currentPeriodEnd = subscription.items.data[0]?.current_period_end ?? null
  const { error: updateError } = await supabase
    .from('firms')
    .update({
      stripe_subscription_status: subscription.status,
      stripe_cancel_at_period_end: subscription.cancel_at_period_end,
      stripe_current_period_end: currentPeriodEnd
        ? new Date(currentPeriodEnd * 1000).toISOString()
        : null,
    })
    .eq('id', profile.firm_id)

  if (updateError) {
    console.error('[stripe] failed to persist cancellation state:', updateError.code)
    return NextResponse.json({ error: 'Could not update billing state' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    currentPeriodEnd,
  })
}
