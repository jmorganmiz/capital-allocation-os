// Required environment variables:
// RESEND_API_KEY — from Resend dashboard → API Keys (https://resend.com/api-keys)

import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)
