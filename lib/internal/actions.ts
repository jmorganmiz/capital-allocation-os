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
