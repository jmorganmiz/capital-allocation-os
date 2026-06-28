import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id, role, firms(name, stripe_customer_id, stripe_subscription_id)')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Administrator access required' }, { status: 403 })
  }

  const firmId = profile.firm_id
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const firmRecord = (Array.isArray(profile.firms) ? profile.firms[0] : profile.firms) as {
    stripe_customer_id?: string | null
    stripe_subscription_id?: string | null
  } | null
  if (firmRecord?.stripe_subscription_id) {
    return NextResponse.json({ error: 'Firm already has a subscription' }, { status: 409 })
  }
  const stripeCustomerId = firmRecord?.stripe_customer_id

  const stripe = getStripe()
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    success_url: `${siteUrl}/settings?success=true`,
    cancel_url: `${siteUrl}/settings`,
    metadata: { firm_id: firmId },
    customer_email: user.email,
    ...(stripeCustomerId ? { customer: stripeCustomerId } : {}),
  })

  return NextResponse.json({ url: session.url })
}
