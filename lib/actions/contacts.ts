'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ContactType = 'broker' | 'seller' | 'lender'

export interface ContactData {
  name: string
  email?: string | null
  phone?: string | null
  company?: string | null
  contact_type?: ContactType | null
  notes?: string | null
}

export async function getContacts() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles').select('firm_id').single()
  if (!profile) return { error: 'Profile not found' }

  const { data, error } = await supabase
    .from('contacts')
    .select(`
      *,
      deal_contacts(count)
    `)
    .eq('firm_id', profile.firm_id)
    .order('name')

  if (error) return { error: error.message }

  const contacts = (data ?? []).map((c: any) => ({
    ...c,
    deal_count: c.deal_contacts?.[0]?.count ?? 0,
  }))

  return { contacts }
}

export async function createContact(data: ContactData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles').select('firm_id').single()
  if (!profile) return { error: 'Profile not found' }

  const { data: contact, error } = await supabase
    .from('contacts')
    .insert({
      firm_id:      profile.firm_id,
      name:         data.name,
      email:        data.email ?? null,
      phone:        data.phone ?? null,
      company:      data.company ?? null,
      contact_type: data.contact_type ?? null,
      notes:        data.notes ?? null,
      created_by:   user.id,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/contacts')
  return { contact }
}

export async function updateContact(id: string, data: ContactData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('contacts')
    .update({
      name:         data.name,
      email:        data.email ?? null,
      phone:        data.phone ?? null,
      company:      data.company ?? null,
      contact_type: data.contact_type ?? null,
      notes:        data.notes ?? null,
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/contacts')
  return { success: true }
}

export async function deleteContact(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/contacts')
  return { success: true }
}

export async function linkContactToDeal(
  contactId: string,
  dealId: string,
  isSource: boolean
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles').select('firm_id').single()
  if (!profile) return { error: 'Profile not found' }

  const { error } = await supabase
    .from('deal_contacts')
    .insert({
      deal_id:    dealId,
      contact_id: contactId,
      firm_id:    profile.firm_id,
      is_source:  isSource,
    })

  if (error) return { error: error.message }

  revalidatePath(`/deals/${dealId}`)
  revalidatePath('/contacts')
  return { success: true }
}

export async function unlinkContactFromDeal(contactId: string, dealId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('deal_contacts')
    .delete()
    .eq('contact_id', contactId)
    .eq('deal_id', dealId)

  if (error) return { error: error.message }

  revalidatePath(`/deals/${dealId}`)
  revalidatePath('/contacts')
  return { success: true }
}

export async function updateDealContactSource(
  contactId: string,
  dealId: string,
  isSource: boolean
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('deal_contacts')
    .update({ is_source: isSource })
    .eq('contact_id', contactId)
    .eq('deal_id', dealId)

  if (error) return { error: error.message }

  revalidatePath(`/deals/${dealId}`)
  return { success: true }
}

export async function getDealContacts(dealId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('deal_contacts')
    .select(`
      *,
      contacts(*)
    `)
    .eq('deal_id', dealId)

  if (error) return { error: error.message }
  return { dealContacts: data ?? [] }
}

export async function getContactWithDeals(contactId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const [{ data: contact, error: cErr }, { data: dealContacts, error: dErr }] =
    await Promise.all([
      supabase.from('contacts').select('*').eq('id', contactId).single(),
      supabase
        .from('deal_contacts')
        .select(`*, deals(id, title, stage_id, deal_stages(name))`)
        .eq('contact_id', contactId),
    ])

  if (cErr) return { error: cErr.message }
  if (dErr) return { error: dErr.message }

  return { contact, dealContacts: dealContacts ?? [] }
}
