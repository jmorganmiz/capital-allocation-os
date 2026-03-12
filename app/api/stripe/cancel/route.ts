import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id, firms(stripe_subscription_id)')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 400 })

  const subscriptionId = (profile.firms as any)?.stripe_subscription_id as string | null

  if (!subscriptionId) {
    return NextResponse.json({ error: 'No active subscription found' }, { status: 400 })
  }

  const stripe = getStripe()

  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  })

  return NextResponse.json({
    ok: true,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    currentPeriodEnd: subscription.items.data[0]?.current_period_end ?? null,
  })
}
