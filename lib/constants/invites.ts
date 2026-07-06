export const INVITE_EXPIRY_DAYS = 7

// Oldest created_at an invite may have and still be accepted or count as pending
export function inviteExpiryCutoff(): string {
  return new Date(Date.now() - INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString()
}
