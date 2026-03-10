import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      // Check if user has a profile — if not, send to onboarding
      const { data: profile } = await supabase
        .from('profiles')
        .select('firm_id')
        .eq('id', data.user.id)
        .single()

      if (!profile?.firm_id) {
        return NextResponse.redirect(`${origin}/onboarding`)
      }
      return NextResponse.redirect(`${origin}/pipeline`)
    }
  }

  return NextResponse.redirect(`${origin}/login`)
}
