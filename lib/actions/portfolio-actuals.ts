'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { assertFirmAccess } from '@/lib/billing-access'

function optionalNumber(value: string, min = -1_000_000_000, max = 1_000_000_000) {
  if (!value.trim()) return null
  const parsed = Number(value.replace(/[^0-9.-]/g, ''))
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) throw new Error('One or more actual values are invalid.')
  return parsed
}

export async function savePortfolioActual(dealId: string, input: {
  periodDate: string; noi: string; occupancy: string; averageMonthlyRent: string
  capitalExpenditures: string; debtService: string; sourceReference: string; notes: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  const { data: profile } = await supabase.from('profiles').select('firm_id').eq('id', user.id).single()
  if (!profile?.firm_id) return { error: 'Profile not found.' }

  const accessError = await assertFirmAccess(supabase, profile.firm_id)
  if (accessError) return { error: accessError }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.periodDate)) return { error: 'Select a reporting period.' }

  try {
    const admin = createAdminClient()
    const { data: deal } = await admin.from('deals').select('id').eq('id', dealId).eq('firm_id', profile.firm_id).single()
    if (!deal) return { error: 'Deal not found.' }
    const occupancyPercent = optionalNumber(input.occupancy, 0, 100)
    const { data, error } = await admin.from('portfolio_actuals').upsert({
      firm_id: profile.firm_id,
      deal_id: dealId,
      period_date: input.periodDate,
      noi: optionalNumber(input.noi),
      occupancy: occupancyPercent == null ? null : occupancyPercent / 100,
      average_monthly_rent: optionalNumber(input.averageMonthlyRent, 0),
      capital_expenditures: optionalNumber(input.capitalExpenditures, 0),
      debt_service: optionalNumber(input.debtService, 0),
      source_reference: input.sourceReference.trim().slice(0, 500) || null,
      notes: input.notes.trim().slice(0, 2000) || null,
      created_by: user.id,
    }, { onConflict: 'deal_id,period_date' }).select('*').single()
    if (error) return { error: error.message }
    revalidatePath(`/deals/${dealId}`)
    return { actual: data }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not save portfolio actuals.' }
  }
}
