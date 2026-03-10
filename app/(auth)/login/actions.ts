'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function loginAction(prevState: any, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  console.log('[login] attempting login for:', email)

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    console.error('[login] error:', error.message, error.status)
    return { error: error.message }
  }

  console.log('[login] success, user:', data.user?.id)
  redirect('/pipeline')
}
