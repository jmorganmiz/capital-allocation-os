import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type Stripe from 'stripe'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook is not configured' }, { status: 503 })
  }

  const stripe = getStripe()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 })
  }

  try {
    const admin = createAdminClient()

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const firmId = session.metadata?.firm_id
      const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
      const subscriptionId = typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id

      if (!firmId || !customerId || !subscriptionId) {
        throw new Error('Checkout session is missing firm or subscription metadata')
      }

      const { error } = await admin
        .from('firms')
        .update({
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          stripe_subscription_status: 'active',
          stripe_cancel_at_period_end: false,
        })
        .eq('id', firmId)
      if (error) throw error
    }

    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      const subscription = event.data.object as Stripe.Subscription
      const firmId = subscription.metadata?.firm_id
      const customerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id
      const currentPeriodEnd = subscription.items.data[0]?.current_period_end ?? null
      const deleted = event.type === 'customer.subscription.deleted'
      const updates = {
        stripe_customer_id: customerId,
        stripe_subscription_id: deleted ? null : subscription.id,
        stripe_subscription_status: subscription.status,
        stripe_cancel_at_period_end: deleted ? false : subscription.cancel_at_period_end,
        stripe_current_period_end: currentPeriodEnd
          ? new Date(currentPeriodEnd * 1000).toISOString()
          : null,
        stripe_last_subscription_event_at: event.created,
      }

      // Skip delayed retries of older events so they cannot overwrite newer state
      const query = admin.from('firms').update(updates)
        .or(`stripe_last_subscription_event_at.is.null,stripe_last_subscription_event_at.lte.${event.created}`)
      const { error } = firmId
        ? await query.eq('id', firmId)
        : await query.eq('stripe_subscription_id', subscription.id)
      if (error) throw error
    }
  } catch (error) {
    console.error('[stripe] webhook persistence failed:', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
