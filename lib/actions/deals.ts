'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { autoScoreDeal } from '@/lib/actions/scoring'

export async function createDeal(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .single()
  if (!profile) return { error: 'Profile not found' }

  const { data: firstStage } = await supabase
    .from('deal_stages')
    .select('id')
    .eq('firm_id', profile.firm_id)
    .order('position', { ascending: true })
    .limit(1)
    .single()

  const askingPriceRaw = (formData.get('asking_price') as string) || ''
  const askingPrice = askingPriceRaw ? parseFloat(askingPriceRaw.replace(/[^0-9.]/g, '')) : null

  const { data: deal, error } = await supabase
    .from('deals')
    .insert({
      firm_id:          profile.firm_id,
      title:            formData.get('title') as string,
      market:           (formData.get('market') as string) || null,
      deal_type:        (formData.get('deal_type') as string) || null,
      source_type:      (formData.get('source_type') as string) || null,
      source_name:      (formData.get('source_name') as string) || null,
      deal_structure:   (formData.get('deal_structure') as string) || null,
      financing_type:   (formData.get('financing_type') as string) || null,
      asking_price:     Number.isFinite(askingPrice) ? askingPrice : null,
      property_size:    (formData.get('property_size') as string) || null,
      address:          (formData.get('address') as string) || null,
      stage_id:         firstStage?.id ?? null,
      created_by:       user.id,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  await supabase.from('deal_events').insert({
    firm_id:       profile.firm_id,
    deal_id:       deal.id,
    event_type:    'deal_created',
    to_stage_id:   firstStage?.id ?? null,
    actor_user_id: user.id,
  })

  await autoScoreDeal(deal.id, profile.firm_id)

  revalidatePath('/pipeline')
  return { deal }
}

export async function updateDealStage(
  dealId: string,
  newStageId: string,
  fromStageId: string | null
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles').select('firm_id').single()
  if (!profile) return { error: 'Profile not found' }

  const { error } = await supabase
    .from('deals')
    .update({ stage_id: newStageId })
    .eq('id', dealId)

  if (error) return { error: error.message }

  await supabase.from('deal_events').insert({
    firm_id:       profile.firm_id,
    deal_id:       dealId,
    event_type:    'stage_changed',
    from_stage_id: fromStageId,
    to_stage_id:   newStageId,
    actor_user_id: user.id,
  })

  revalidatePath('/pipeline')
  return { success: true }
}

export async function killDeal(
  dealId: string,
  killReasonId: string,
  notes: string | null,
  fromStageId: string | null,
  killedStageId: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles').select('firm_id').single()
  if (!profile) return { error: 'Profile not found' }

  const { error: dealError } = await supabase
    .from('deals')
    .update({
      stage_id:    killedStageId,
      is_archived: true,
      archived_at: new Date().toISOString(),
    })
    .eq('id', dealId)
  if (dealError) return { error: dealError.message }

  // Copy most recent financial snapshot so the numbers at kill time are preserved
  const { data: latestSnapshot } = await supabase
    .from('deal_financial_snapshots')
    .select('purchase_price, noi, cap_rate, debt_rate, ltv, irr')
    .eq('deal_id', dealId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestSnapshot) {
    await supabase.from('deal_financial_snapshots').insert({
      firm_id:       profile.firm_id,
      deal_id:       dealId,
      purchase_price: latestSnapshot.purchase_price,
      noi:           latestSnapshot.noi,
      cap_rate:      latestSnapshot.cap_rate,
      debt_rate:     latestSnapshot.debt_rate,
      ltv:           latestSnapshot.ltv,
      irr:           latestSnapshot.irr,
    })
  }

  await supabase.from('deal_events').insert({
    firm_id:        profile.firm_id,
    deal_id:        dealId,
    event_type:     'killed',
    from_stage_id:  fromStageId,
    to_stage_id:    killedStageId,
    kill_reason_id: killReasonId,
    notes:          notes || null,
    actor_user_id:  user.id,
  })

  revalidatePath('/pipeline')
  revalidatePath('/graveyard')
  return { success: true }
}

export async function upsertDealNote(
  dealId: string,
  section: 'overview' | 'risks' | 'notes',
  content: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles').select('firm_id').single()
  if (!profile) return { error: 'Profile not found' }

  const { data: existing } = await supabase
    .from('deal_notes')
    .select('id')
    .eq('deal_id', dealId)
    .eq('section', section)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('deal_notes')
      .update({ content, updated_by: user.id })
      .eq('id', existing.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('deal_notes')
      .insert({ deal_id: dealId, firm_id: profile.firm_id, section, content, created_by: user.id })
    if (error) return { error: error.message }

    await supabase.from('deal_events').insert({
      firm_id:       profile.firm_id,
      deal_id:       dealId,
      event_type:    'note_added',
      notes:         `Section: ${section}`,
      actor_user_id: user.id,
    })
  }

  revalidatePath(`/deals/${dealId}`)
  return { success: true }
}

export async function uploadFileMetadata(params: {
  dealId: string
  storagePath: string
  filename: string
  mimeType: string | null
  sizeBytes: number | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles').select('firm_id').single()
  if (!profile) return { error: 'Profile not found' }

  const { data: file, error } = await supabase
    .from('deal_files')
    .insert({
      deal_id:        params.dealId,
      firm_id:        profile.firm_id,
      storage_path:   params.storagePath,
      filename:       params.filename,
      mime_type:      params.mimeType,
      size_bytes:     params.sizeBytes,
      uploaded_by:    user.id,
    })
    .select()
    .single()
  if (error) return { error: error.message }

  await supabase.from('deal_events').insert({
    firm_id:       profile.firm_id,
    deal_id:       params.dealId,
    event_type:    'file_added',
    notes:         params.filename,
    actor_user_id: user.id,
  })

  revalidatePath(`/deals/${params.dealId}`)
  return { file }
}

export async function createDealFromUpload({
  mode,
  dealName,
  existingDealId,
  storagePath,
  filename,
  mimeType,
  sizeBytes,
  stageId,
}: {
  mode: 'new' | 'existing'
  dealName: string
  existingDealId: string | null
  storagePath: string
  filename: string
  mimeType: string
  sizeBytes: number
  stageId: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'Profile not found' }

  let dealId = existingDealId

  if (mode === 'new') {
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .insert({
        firm_id: profile.firm_id,
        title: dealName,
        stage_id: stageId,
        owner_user_id: user.id,
        intake_type: 'upload',
        created_by: user.id,
      })
      .select()
      .single()

    if (dealError) return { error: dealError.message }
    dealId = deal.id

    await supabase.from('deal_events').insert({
      deal_id: dealId,
      firm_id: profile.firm_id,
      actor_user_id: user.id,
      event_type: 'deal_created',
      notes: `Deal created via OM upload: ${filename}`,
    })
  }

  const { error: fileError } = await supabase.from('deal_files').insert({
    deal_id: dealId,
    firm_id: profile.firm_id,
    storage_path: storagePath,
    filename,
    mime_type: mimeType,
    size_bytes: sizeBytes,
    uploaded_by: user.id,
  })

  if (fileError) return { error: fileError.message }

  await supabase.from('deal_events').insert({
    deal_id: dealId,
    firm_id: profile.firm_id,
    actor_user_id: user.id,
    event_type: 'file_added',
    notes: filename,
  })

  if (mode === 'new') {
    const { data: deal } = await supabase.from('deals').select('*').eq('id', dealId).single()
    return { deal }
  }

  return { deal: { id: dealId } }
}

export async function createDealFromOM(params: {
  title: string
  address: string | null
  market: string | null
  deal_type: string | null
  source_name: string | null
  storagePath: string
  filename: string
  mimeType: string
  sizeBytes: number
  stageId: string
  financials: {
    asking_price: number | null
    noi: number | null
    cap_rate: number | null
  }
  addBrokerContact: boolean
  brokerName: string | null       // raw broker name for contact record
  brokerCompany: string | null    // brokerage for contact company field
  snapshotNotes: string | null    // additional property details summary
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'Profile not found' }

  const { data: deal, error: dealError } = await supabase
    .from('deals')
    .insert({
      firm_id:       profile.firm_id,
      title:         params.title,
      address:       params.address,
      market:        params.market,
      deal_type:     params.deal_type,
      source_type:   params.source_name ? 'Broker' : null,
      source_name:   params.source_name,
      asking_price:  params.financials.asking_price,
      stage_id:      params.stageId,
      owner_user_id: user.id,
      intake_type:   'upload',
      created_by:    user.id,
    })
    .select()
    .single()

  if (dealError) return { error: dealError.message }

  await supabase.from('deal_events').insert({
    deal_id:       deal.id,
    firm_id:       profile.firm_id,
    actor_user_id: user.id,
    event_type:    'deal_created',
    notes:         `Deal created via OM upload: ${params.filename}`,
  })

  // Create financial snapshot if any data was extracted
  const { asking_price, noi, cap_rate } = params.financials
  if (asking_price !== null || noi !== null || cap_rate !== null) {
    await supabase.from('deal_financial_snapshots').insert({
      deal_id:        deal.id,
      firm_id:        profile.firm_id,
      purchase_price: asking_price,
      noi,
      cap_rate,
      created_by:     user.id,
    })
  }

  // Record uploaded file
  await supabase.from('deal_files').insert({
    deal_id:      deal.id,
    firm_id:      profile.firm_id,
    storage_path: params.storagePath,
    filename:     params.filename,
    mime_type:    params.mimeType,
    size_bytes:   params.sizeBytes,
    uploaded_by:  user.id,
  })

  await supabase.from('deal_events').insert({
    deal_id:       deal.id,
    firm_id:       profile.firm_id,
    actor_user_id: user.id,
    event_type:    'file_added',
    notes:         params.filename,
  })

  // Save additional property details (SF, year built, units, occupancy) as a deal note
  if (params.snapshotNotes) {
    await supabase.from('deal_notes').insert({
      deal_id:    deal.id,
      firm_id:    profile.firm_id,
      section:    'overview',
      content:    `Property details from OM: ${params.snapshotNotes}`,
      created_by: user.id,
    })
  }

  // Optionally create broker contact and link to deal
  // Use the raw broker name (not the combined source_name string) for the contact record
  if (params.addBrokerContact && params.brokerName) {
    const { data: contact } = await supabase
      .from('contacts')
      .insert({
        firm_id:      profile.firm_id,
        name:         params.brokerName,
        company:      params.brokerCompany,
        contact_type: 'broker',
        created_by:   user.id,
      })
      .select()
      .single()

    if (contact) {
      await supabase.from('deal_contacts').insert({
        deal_id:    deal.id,
        contact_id: contact.id,
        firm_id:    profile.firm_id,
        is_source:  true,
      })
    }
  }

  await autoScoreDeal(deal.id, profile.firm_id)

  revalidatePath('/pipeline')
  revalidatePath('/contacts')
  return { deal }
}

export async function listArchivedDeals(filters?: {
  market?: string
  dealType?: string
  search?: string
}) {
  const supabase = await createClient()

  let query = supabase
    .from('deals')
    .select(`
      *,
      deal_events(event_type, created_at, notes, kill_reasons(name))
    `)
    .eq('is_archived', true)
    .order('archived_at', { ascending: false })

  if (filters?.market)   query = query.eq('market', filters.market)
  if (filters?.dealType) query = query.eq('deal_type', filters.dealType)
  if (filters?.search)   query = query.ilike('title', `%${filters.search}%`)

  const { data, error } = await query
  if (error) return { error: error.message }
  return { deals: data }
}

export async function searchDeals(query: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles').select('firm_id').eq('id', user.id).single()
  if (!profile) return { error: 'Profile not found' }

  const term = `%${query}%`

  // Search deals by title, market, source_name
  const { data: dealMatches } = await supabase
    .from('deals')
    .select('id, title, market, stage_id, deal_stages(name)')
    .eq('firm_id', profile.firm_id)
    .eq('is_archived', false)
    .or(`title.ilike.${term},market.ilike.${term},source_name.ilike.${term}`)
    .limit(10)

  // Search deal_notes content
  const { data: noteMatches } = await supabase
    .from('deal_notes')
    .select('deal_id')
    .eq('firm_id', profile.firm_id)
    .ilike('content', term)
    .limit(10)

  const noteIds = (noteMatches ?? []).map(n => n.deal_id)
  let extra: typeof dealMatches = []
  if (noteIds.length > 0) {
    const { data } = await supabase
      .from('deals')
      .select('id, title, market, stage_id, deal_stages(name)')
      .eq('firm_id', profile.firm_id)
      .eq('is_archived', false)
      .in('id', noteIds)
      .limit(5)
    extra = data ?? []
  }

  // Merge, deduplicate
  const seen = new Set<string>()
  const all = [...(dealMatches ?? []), ...extra].filter(d => {
    if (seen.has(d.id)) return false
    seen.add(d.id)
    return true
  })

  const deals = all.map(d => ({
    id: d.id,
    title: d.title,
    market: d.market,
    stage_name: (d.deal_stages as any)?.name ?? null,
  }))

  return { deals }
}

export async function updateDealOwner(dealId: string, ownerUserId: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles').select('firm_id').single()
  if (!profile) return { error: 'Profile not found' }

  const { error } = await supabase
    .from('deals')
    .update({ owner_user_id: ownerUserId || null })
    .eq('id', dealId)
    .eq('firm_id', profile.firm_id)

  if (error) return { error: error.message }

  revalidatePath(`/deals/${dealId}`)
  return { success: true }
}

export async function updateDealFields(
  dealId: string,
  fields: {
    asking_price?: number | null
    deal_structure?: string | null
    financing_type?: string | null
    property_size?: string | null
    address?: string | null
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles').select('firm_id').single()
  if (!profile) return { error: 'Profile not found' }

  const { error } = await supabase
    .from('deals')
    .update(fields)
    .eq('id', dealId)
    .eq('firm_id', profile.firm_id)

  if (error) return { error: error.message }

  revalidatePath(`/deals/${dealId}`)
  return { success: true }
}
