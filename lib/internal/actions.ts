'use server'

import { revalidatePath } from 'next/cache'
import { getInternalContext, can, logActivity } from '@/lib/internal/auth'

const TASK_STATUSES = new Set(['open', 'in_progress', 'blocked', 'done'])
const ACCOUNT_STAGES = new Set(['prospect', 'demo', 'trial', 'paying', 'churned'])

export async function createInternalTask(input: {
  title: string
  description?: string
  assigneeId?: string | null
  dueDate?: string | null
  salesAccountId?: string | null
}) {
  const context = await getInternalContext()
  if (!context || !can(context, 'team', 'write')) return { error: 'Not authorized.' }

  const title = input.title?.trim().slice(0, 200)
  if (!title) return { error: 'Task title is required.' }

  const { data, error } = await context.supabase.from('tasks').insert({
    title,
    description: input.description?.trim().slice(0, 2000) || null,
    assignee_id: input.assigneeId || null,
    due_date: input.dueDate || null,
    sales_account_id: input.salesAccountId || null,
    created_by: context.userId,
  }).select('id').single()
  if (error) return { error: error.message }

  await logActivity(context, 'team', 'task_created', { task_id: data.id, title })
  revalidatePath('/internal/team')
  return { id: data.id }
}

export async function updateInternalTaskStatus(taskId: string, status: string) {
  const context = await getInternalContext()
  if (!context || !can(context, 'team', 'write')) return { error: 'Not authorized.' }
  if (!TASK_STATUSES.has(status)) return { error: 'Invalid status.' }

  const { error } = await context.supabase
    .from('tasks')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', taskId)
  if (error) return { error: error.message }

  await logActivity(context, 'team', 'task_status_changed', { task_id: taskId, status })
  revalidatePath('/internal/team')
  return { success: true }
}

export async function upsertSalesAccount(input: {
  id?: string
  companyName: string
  stage: string
  monthlyValue?: string
  notes?: string
  firmId?: string | null
}) {
  const context = await getInternalContext()
  if (!context || !can(context, 'ops', 'write')) return { error: 'Not authorized.' }

  const companyName = input.companyName?.trim().slice(0, 200)
  if (!companyName) return { error: 'Company name is required.' }
  if (!ACCOUNT_STAGES.has(input.stage)) return { error: 'Invalid stage.' }

  const monthlyValueRaw = Number(String(input.monthlyValue ?? '').replace(/[^0-9.]/g, ''))
  const record = {
    company_name: companyName,
    stage: input.stage,
    monthly_value: Number.isFinite(monthlyValueRaw) && monthlyValueRaw > 0 ? monthlyValueRaw : null,
    notes: input.notes?.trim().slice(0, 2000) || null,
    firm_id: input.firmId || null,
    owner_id: context.userId,
    last_activity_at: new Date().toISOString(),
  }

  const query = input.id
    ? context.supabase.from('sales_accounts').update(record).eq('id', input.id).select('id').single()
    : context.supabase.from('sales_accounts').insert(record).select('id').single()
  const { data, error } = await query
  if (error) return { error: error.message }

  await logActivity(context, 'ops', input.id ? 'account_updated' : 'account_created', { account_id: data.id, company: companyName, stage: input.stage })
  revalidatePath('/internal')
  return { id: data.id }
}

const CAMPAIGN_STATUSES = new Set(['planned', 'active', 'paused', 'completed'])
const OUTREACH_STATUSES = new Set(['contacted', 'responded', 'converted', 'dead'])
const INTERNAL_ROLES = new Set(['owner', 'engineer', 'finance', 'employee'])

export async function upsertCampaign(input: {
  id?: string
  name: string
  channel: string
  status: string
  startDate?: string | null
  endDate?: string | null
}) {
  const context = await getInternalContext()
  if (!context || !can(context, 'marketing', 'write')) return { error: 'Not authorized.' }

  const name = input.name?.trim().slice(0, 160)
  const channel = input.channel?.trim().slice(0, 80)
  if (!name || !channel) return { error: 'Campaign name and channel are required.' }
  if (!CAMPAIGN_STATUSES.has(input.status)) return { error: 'Invalid status.' }

  const record = {
    name,
    channel,
    status: input.status,
    start_date: input.startDate || null,
    end_date: input.endDate || null,
    owner_id: context.userId,
  }
  const query = input.id
    ? context.supabase.from('campaigns').update(record).eq('id', input.id).select('id').single()
    : context.supabase.from('campaigns').insert(record).select('id').single()
  const { data, error } = await query
  if (error) return { error: error.message }

  await logActivity(context, 'marketing', input.id ? 'campaign_updated' : 'campaign_created', { campaign_id: data.id, name })
  revalidatePath('/internal/marketing')
  return { id: data.id }
}

export async function addOutreachContact(input: {
  campaignId?: string | null
  contactName: string
  company?: string
  notes?: string
}) {
  const context = await getInternalContext()
  if (!context || !can(context, 'marketing', 'write')) return { error: 'Not authorized.' }

  const contactName = input.contactName?.trim().slice(0, 160)
  if (!contactName) return { error: 'Contact name is required.' }

  const { data, error } = await context.supabase.from('outreach_contacts').insert({
    campaign_id: input.campaignId || null,
    contact_name: contactName,
    company: input.company?.trim().slice(0, 160) || null,
    notes: input.notes?.trim().slice(0, 2000) || null,
    last_touch: new Date().toISOString().slice(0, 10),
  }).select('id').single()
  if (error) return { error: error.message }

  await logActivity(context, 'marketing', 'outreach_contact_added', { contact_id: data.id, name: contactName })
  revalidatePath('/internal/marketing')
  return { id: data.id }
}

export async function updateOutreachStatus(contactId: string, status: string) {
  const context = await getInternalContext()
  if (!context || !can(context, 'marketing', 'write')) return { error: 'Not authorized.' }
  if (!OUTREACH_STATUSES.has(status)) return { error: 'Invalid status.' }

  const { error } = await context.supabase
    .from('outreach_contacts')
    .update({ status, last_touch: new Date().toISOString().slice(0, 10) })
    .eq('id', contactId)
  if (error) return { error: error.message }

  await logActivity(context, 'marketing', 'outreach_status_changed', { contact_id: contactId, status })
  revalidatePath('/internal/marketing')
  return { success: true }
}

export async function upsertEquityHolder(input: { id?: string; holderName: string; percentage?: string; notes?: string }) {
  const context = await getInternalContext()
  if (!context || !can(context, 'ownership', 'full')) return { error: 'Not authorized.' }

  const holderName = input.holderName?.trim().slice(0, 160)
  if (!holderName) return { error: 'Holder name is required.' }
  const percentageRaw = Number(String(input.percentage ?? '').replace(/[^0-9.]/g, ''))
  const percentage = Number.isFinite(percentageRaw) && percentageRaw >= 0 && percentageRaw <= 100 ? percentageRaw : null

  const record = {
    holder_name: holderName,
    percentage,
    notes: input.notes?.trim().slice(0, 2000) || null,
    updated_at: new Date().toISOString(),
  }
  const query = input.id
    ? context.supabase.from('equity_reference').update(record).eq('id', input.id).select('id').single()
    : context.supabase.from('equity_reference').insert(record).select('id').single()
  const { data, error } = await query
  if (error) return { error: error.message }

  await logActivity(context, 'ownership', input.id ? 'equity_updated' : 'equity_added', { holder: holderName })
  revalidatePath('/internal/ownership')
  return { id: data.id }
}

export async function addDecision(input: { title: string; summary: string }) {
  const context = await getInternalContext()
  if (!context || !can(context, 'ownership', 'write')) return { error: 'Not authorized.' }

  const title = input.title?.trim().slice(0, 200)
  const summary = input.summary?.trim().slice(0, 4000)
  if (!title || !summary) return { error: 'Title and summary are required.' }

  const { data, error } = await context.supabase.from('decision_log').insert({
    title,
    summary,
    decided_by: context.userId,
  }).select('id').single()
  if (error) return { error: error.message }

  await logActivity(context, 'ownership', 'decision_logged', { decision_id: data.id, title })
  revalidatePath('/internal/ownership')
  return { id: data.id }
}

export async function addInternalUser(input: { email: string; fullName: string; role: string }) {
  const context = await getInternalContext()
  if (!context || context.role !== 'owner') return { error: 'Only the owner can manage the internal roster.' }

  const email = input.email?.trim().toLowerCase().slice(0, 200)
  const fullName = input.fullName?.trim().slice(0, 120)
  if (!email || !fullName) return { error: 'Email and name are required.' }
  if (!INTERNAL_ROLES.has(input.role)) return { error: 'Invalid role.' }

  // The person must already have a Dealstash login; look them up by email.
  const { createAdminClient } = await import('@/lib/supabase/server')
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('id').eq('email', email).maybeSingle()
  if (!profile) return { error: 'No account found for that email. Ask them to sign up first, then add them here.' }

  const { error } = await context.supabase.from('internal_users').insert({
    id: profile.id,
    full_name: fullName,
    role: input.role,
  })
  if (error) {
    if (error.code === '23505') return { error: 'That person is already on the internal roster.' }
    return { error: error.message }
  }

  await logActivity(context, 'team', 'internal_user_added', { email, role: input.role })
  revalidatePath('/internal/team')
  return { success: true }
}

export async function removeInternalUser(userId: string) {
  const context = await getInternalContext()
  if (!context || context.role !== 'owner') return { error: 'Only the owner can manage the internal roster.' }
  if (userId === context.userId) return { error: 'You cannot remove yourself.' }

  const { error } = await context.supabase.from('internal_users').delete().eq('id', userId)
  if (error) return { error: error.message }

  await logActivity(context, 'team', 'internal_user_removed', { user_id: userId })
  revalidatePath('/internal/team')
  return { success: true }
}
