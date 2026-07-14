import { createAdminClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/types/database'

type DealCreatedSource = 'manual' | 'upload' | 'email' | 'csv_import' | 'property_finder'

export async function recordDealCreatedUsage({
  firmId,
  userId,
  dealId,
  source,
  quantity = 1,
  idempotencyKey,
  metadata = {},
}: {
  firmId: string
  userId: string | null | undefined
  dealId?: string | null
  source: DealCreatedSource
  quantity?: number
  idempotencyKey?: string
  metadata?: Record<string, Json>
}) {
  if (!firmId || !userId || quantity <= 0) return

  const key = idempotencyKey ?? (dealId
    ? `deal_created:${dealId}`
    : `deal_created:${source}:${firmId}:${userId}:${Date.now()}`)

  const admin = createAdminClient()
  const { error } = await admin.from('usage_events').upsert({
    firm_id: firmId,
    user_id: userId,
    event_type: 'deal_created',
    quantity,
    billable_credits: 0,
    idempotency_key: key,
    metadata: {
      source,
      deal_id: dealId ?? null,
      ...metadata,
    },
  }, { onConflict: 'firm_id,idempotency_key' })

  if (error) {
    console.error('[usage] deal_created event failed:', error.code, error.message)
  }
}
