'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { assertFirmAccess } from '@/lib/billing-access'
import { autoScoreDeal } from '@/lib/actions/scoring'

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function sourceKey(url: string, address: string, name: string) {
  if (url) {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Use an http or https listing URL.')
    if (parsed.username || parsed.password) throw new Error('Listing URLs cannot contain embedded credentials.')
    for (const key of [...parsed.searchParams.keys()]) {
      if (key.toLowerCase().startsWith('utm_')) parsed.searchParams.delete(key)
    }
    parsed.searchParams.sort()
    const query = parsed.searchParams.toString()
    return `url:${parsed.hostname.toLowerCase()}${parsed.pathname.toLowerCase().replace(/\/$/, '')}${query ? `?${query}` : ''}`
  }
  return `manual:${normalize(address || name)}`
}

function numberOrNull(value: unknown) {
  if (value === '' || value == null) return null
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

export async function captureSourcingOpportunity(input: {
  sourceUrl: string; propertyName: string; address: string; market: string
  assetType: string; askingPrice: string; unitCount: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  const { data: profile } = await supabase.from('profiles').select('firm_id').eq('id', user.id).single()
  if (!profile?.firm_id) return { error: 'Profile not found.' }

  const accessError = await assertFirmAccess(supabase, profile.firm_id)
  if (accessError) return { error: accessError }

  const propertyName = input.propertyName.trim().slice(0, 200)
  const address = input.address.trim().slice(0, 300)
  const market = input.market.trim().slice(0, 160)
  const assetType = input.assetType.trim().slice(0, 120)
  const sourceUrl = input.sourceUrl.trim().slice(0, 2000)
  if (!propertyName) return { error: 'Property name is required.' }

  let key: string
  try { key = sourceKey(sourceUrl, address, propertyName) } catch (error) { return { error: error instanceof Error ? error.message : 'Invalid source URL.' } }
  if (key === 'manual:') return { error: 'Add a listing URL, address, or recognizable property name.' }

  const askingPrice = numberOrNull(input.askingPrice)
  const unitCountRaw = numberOrNull(input.unitCount)
  const unitCount = unitCountRaw == null ? null : Math.max(0, Math.round(unitCountRaw))
  const admin = createAdminClient()
  const [{ data: deals }, { data: boxes }] = await Promise.all([
    admin.from('deals').select('id, title, address').eq('firm_id', profile.firm_id).limit(1000),
    admin.from('buy_boxes').select('*').eq('firm_id', profile.firm_id),
  ])
  const duplicate = (deals ?? []).find((deal) => address && normalize(deal.address ?? '') === normalize(address))
    ?? (deals ?? []).find((deal) => normalize(deal.title) === normalize(propertyName))
  const box = (boxes ?? []).find((item) => normalize(item.asset_type) === normalize(assetType)) ?? null

  const reasons: string[] = []
  let score: number | null = null
  if (box) {
    score = 20
    if (normalize(box.asset_type) === normalize(assetType)) { score += 30; reasons.push('Asset type matches buy box') }
    const markets = String(box.preferred_markets ?? '').split(',').map(normalize).filter(Boolean)
    if (!markets.length) { score += 15; reasons.push('No market restriction') }
    else if (markets.some((item) => normalize(market).includes(item) || item.includes(normalize(market)))) { score += 25; reasons.push('Preferred market') }
    else reasons.push('Outside preferred markets')
    if (box.max_asking_price == null) { score += 15; reasons.push('No price ceiling') }
    else if (askingPrice != null && askingPrice <= Number(box.max_asking_price)) { score += 25; reasons.push('Within price ceiling') }
    else if (askingPrice != null) reasons.push('Above price ceiling')
    if (address && unitCount != null) score += 10
    score = Math.min(100, score)
  } else {
    reasons.push('No matching buy box yet')
  }
  if (duplicate) reasons.unshift('Possible duplicate in firm memory')

  const { data, error } = await admin.from('sourcing_opportunities').insert({
    firm_id: profile.firm_id,
    source_type: sourceUrl ? 'listing_url' : 'manual',
    source_url: sourceUrl || null,
    source_key: key,
    property_name: propertyName,
    address: address || null,
    market: market || null,
    asset_type: assetType || null,
    asking_price: askingPrice,
    unit_count: unitCount,
    status: box ? 'matched' : 'new',
    buy_box_id: box?.id ?? null,
    match_score: score,
    match_reasons: reasons,
    possible_duplicate_deal_id: duplicate?.id ?? null,
    captured_by: user.id,
  }).select('*').single()
  if (error?.code === '23505') return { error: 'This opportunity is already in the sourcing inbox.' }
  if (error) return { error: error.message }
  revalidatePath('/sourcing')
  return { opportunity: data }
}

export async function promoteSourcingOpportunity(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  const { data: profile } = await supabase.from('profiles').select('firm_id').eq('id', user.id).single()
  if (!profile?.firm_id) return { error: 'Profile not found.' }

  const accessError = await assertFirmAccess(supabase, profile.firm_id)
  if (accessError) return { error: accessError }
  const admin = createAdminClient()
  const { data: dealId, error } = await admin.rpc('promote_sourcing_opportunity', { p_opportunity_id: id, p_firm_id: profile.firm_id, p_user_id: user.id })
  if (error) {
    if (error.message.includes('POSSIBLE_DUPLICATE')) return { error: 'Resolve the possible duplicate before promoting this opportunity.' }
    if (error.message.includes('OPPORTUNITY_DISMISSED')) return { error: 'Dismissed opportunities cannot be promoted.' }
    return { error: error.message }
  }
  if (!dealId) return { error: 'Could not create deal.' }
  await autoScoreDeal(dealId, profile.firm_id)
  revalidatePath('/sourcing')
  revalidatePath('/pipeline')
  return { dealId }
}

export async function dismissSourcingOpportunity(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  const { data: profile } = await supabase.from('profiles').select('firm_id').eq('id', user.id).single()
  if (!profile?.firm_id) return { error: 'Profile not found.' }

  const accessError = await assertFirmAccess(supabase, profile.firm_id)
  if (accessError) return { error: accessError }
  const admin = createAdminClient()
  const { error } = await admin.from('sourcing_opportunities').update({ status: 'dismissed' }).eq('id', id).eq('firm_id', profile.firm_id).neq('status', 'promoted')
  if (error) return { error: error.message }
  revalidatePath('/sourcing')
  return {}
}
