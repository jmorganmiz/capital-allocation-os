// Required environment variables:
// RESEND_API_KEY — from Resend dashboard → API Keys (https://resend.com/api-keys)

import { Resend } from 'resend'

let resend: Resend | undefined

export function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured')

  resend ??= new Resend(apiKey)
  return resend
}
