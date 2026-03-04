'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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

  const { data: deal, error } = await supabase
    .from('deals')
    .insert({
      firm_id:     profile.firm_id,
      title:       formData.get('title') as string,
      market:      (formData.get('market') as string) || null,
      deal_type:   (formData.get('deal_type') as string) || null,
      source_type: (formData.get('source_type') as string) || null,
      source_name: (formData.get('source_name') as string) || null,
      stage_id:    firstStage?.id ?? null,
      created_by:  user.id,
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
