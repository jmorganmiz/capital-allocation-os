import 'server-only'

export function isPlatformAdmin(email: string | null | undefined) {
  if (!email) return false
  const allowed = (process.env.PLATFORM_ADMIN_EMAILS ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
  return allowed.includes(email.toLowerCase())
}
