import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export type FirmStage = { id: string; name: string }
export type FirmMember = { id: string; full_name: string | null; email: string }

export type FirmDataResponse = {
  stages: FirmStage[]
  members: FirmMember[]
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single()

  if (!profile?.firm_id) {
    return NextResponse.json({ error: 'No firm found for this user' }, { status: 404 })
  }

  const firmId: string = profile.firm_id

  const [stagesResult, membersResult] = await Promise.all([
    supabase
      .from('deal_stages')
      .select('id, name')
      .eq('firm_id', firmId)
      .order('position'),
    supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('firm_id', firmId)
      .order('full_name'),
  ])

  return NextResponse.json({
    stages: stagesResult.data ?? [],
    members: membersResult.data ?? [],
  } satisfies FirmDataResponse)
}
