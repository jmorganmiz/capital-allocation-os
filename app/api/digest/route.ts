import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { resend } from '@/lib/resend'

const FROM = 'team@getdealstash.com'
const SUBJECT = 'Your Dealstash Weekly Digest'
const SITE_URL = 'https://getdealstash.com'

// Protect the endpoint with a shared secret so it's only callable by cron/Vercel
function isAuthorized(request: Request): boolean {
  const auth = request.headers.get('authorization')
  const secret = process.env.DIGEST_SECRET
  if (!secret) return true // open in dev if not set
  return auth === `Bearer ${secret}`
}

function buildEmailHtml({
  firmName,
  activeDeals,
  newDeals,
  movedDeals,
  staleDeals,
}: {
  firmName: string
  activeDeals: number
  newDeals: { title: string }[]
  movedDeals: { title: string; fromStage: string | null; toStage: string | null }[]
  staleDeals: { title: string; daysSince: number }[]
}): string {
  const movedRows = movedDeals.map(d => `
    <tr>
      <td style="padding:6px 0;color:#111827;font-size:14px;">${esc(d.title)}</td>
      <td style="padding:6px 0 6px 16px;color:#6b7280;font-size:14px;">
        ${d.fromStage ? `${esc(d.fromStage)} → ` : ''}${esc(d.toStage ?? '—')}
      </td>
    </tr>`).join('')

  const newRows = newDeals.map(d => `
    <tr>
      <td style="padding:6px 0;color:#111827;font-size:14px;">${esc(d.title)}</td>
    </tr>`).join('')

  const staleRows = staleDeals.map(d => `
    <tr>
      <td style="padding:6px 0;color:#111827;font-size:14px;">${esc(d.title)}</td>
      <td style="padding:6px 0 6px 16px;color:#ef4444;font-size:14px;">${d.daysSince} days ago</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${SUBJECT}</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;border:1px solid #e5e7eb;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#111827;padding:28px 32px;">
              <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#9ca3af;">Dealstash</p>
              <h1 style="margin:4px 0 0;font-size:20px;font-weight:700;color:#ffffff;">${esc(firmName)}</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">

              <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">
                Here's a summary of deal activity for the past 7 days.
              </p>

              <!-- Glance stats -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  ${statCell('Active Deals', String(activeDeals))}
                  ${statCell('New This Week', String(newDeals.length))}
                  ${statCell('Stage Changes', String(movedDeals.length))}
                </tr>
              </table>

              ${movedDeals.length > 0 ? `
              <!-- Stage moves -->
              <h2 style="margin:0 0 12px;font-size:15px;font-weight:600;color:#111827;">Stage Changes</h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                ${movedRows}
              </table>` : ''}

              ${newDeals.length > 0 ? `
              <!-- New deals -->
              <h2 style="margin:0 0 12px;font-size:15px;font-weight:600;color:#111827;">New Deals Added</h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                ${newRows}
              </table>` : ''}

              ${staleDeals.length > 0 ? `
              <!-- Stale deals -->
              <h2 style="margin:0 0 4px;font-size:15px;font-weight:600;color:#111827;">Needs Attention</h2>
              <p style="margin:0 0 12px;font-size:13px;color:#6b7280;">Deals with no activity in 30+ days.</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;background:#fef2f2;border-radius:6px;padding:4px 12px;" bgcolor="#fef2f2">
                ${staleRows}
              </table>` : `
              <div style="background:#f0fdf4;border-radius:6px;padding:12px 16px;margin-bottom:28px;">
                <p style="margin:0;font-size:14px;color:#16a34a;">All deals have had recent activity. Great work!</p>
              </div>`}

              ${movedDeals.length === 0 && newDeals.length === 0 ? `
              <p style="font-size:14px;color:#6b7280;">No stage changes or new deals this week.</p>` : ''}

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 32px;">
              <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">
                You're receiving this because you're a member of ${esc(firmName)} on Dealstash.
              </p>
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                <a href="${SITE_URL}" style="color:#6b7280;text-decoration:underline;">${SITE_URL}</a>
                &nbsp;·&nbsp;
                <a href="${SITE_URL}/settings" style="color:#6b7280;text-decoration:underline;">Manage preferences</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function statCell(label: string, value: string): string {
  return `<td width="33%" style="padding:0 8px 0 0;">
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:16px;text-align:center;">
      <p style="margin:0;font-size:24px;font-weight:700;color:#111827;">${value}</p>
      <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">${label}</p>
    </div>
  </td>`
}

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Get all firms
  const { data: firms, error: firmsError } = await supabase
    .from('firms')
    .select('id, name')

  if (firmsError) {
    return NextResponse.json({ error: firmsError.message }, { status: 500 })
  }

  const results: { firm: string; emails: string[]; status: string }[] = []

  for (const firm of firms ?? []) {
    // Get all firm members with emails
    const { data: members } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('firm_id', firm.id)

    const emails = (members ?? [])
      .map((m: any) => m.email)
      .filter(Boolean) as string[]

    if (emails.length === 0) continue

    // Active (non-archived) deals
    const { data: activeDealsData } = await supabase
      .from('deals')
      .select('id, title, created_at')
      .eq('firm_id', firm.id)
      .eq('is_archived', false)

    const activeDeals = (activeDealsData ?? []) as { id: string; title: string; created_at: string }[]

    // New deals in last 7 days
    const newDeals = activeDeals
      .filter(d => d.created_at >= sevenDaysAgo)
      .map(d => ({ title: d.title }))

    // Stage changes in last 7 days
    const { data: stageEvents } = await supabase
      .from('deal_events')
      .select(`
        deal_id,
        deals(title),
        from_stage:deal_stages!from_stage_id(name),
        to_stage:deal_stages!to_stage_id(name)
      `)
      .eq('firm_id', firm.id)
      .eq('event_type', 'stage_changed')
      .gte('created_at', sevenDaysAgo)

    const movedDeals = (stageEvents ?? []).map((e: any) => ({
      title:     e.deals?.title ?? 'Unknown',
      fromStage: e.from_stage?.name ?? null,
      toStage:   e.to_stage?.name ?? null,
    }))

    // Stale deals: active deals where last event is older than 30 days (or no events)
    const activeDealIds = activeDeals.map(d => d.id)
    const staleDeals: { title: string; daysSince: number }[] = []

    if (activeDealIds.length > 0) {
      const { data: recentEvents } = await supabase
        .from('deal_events')
        .select('deal_id, created_at')
        .in('deal_id', activeDealIds)
        .order('created_at', { ascending: false })

      // Build map of deal_id → most recent event date
      const lastActivity: Record<string, Date> = {}
      for (const deal of activeDeals) {
        lastActivity[deal.id] = new Date(deal.created_at)
      }
      for (const ev of recentEvents ?? []) {
        const evDate = new Date((ev as any).created_at)
        if (!lastActivity[(ev as any).deal_id] || evDate > lastActivity[(ev as any).deal_id]) {
          lastActivity[(ev as any).deal_id] = evDate
        }
      }

      for (const deal of activeDeals) {
        const last = lastActivity[deal.id]
        const days = daysBetween(last, now)
        if (days >= 30) {
          staleDeals.push({ title: deal.title, daysSince: days })
        }
      }

      staleDeals.sort((a, b) => b.daysSince - a.daysSince)
    }

    const html = buildEmailHtml({
      firmName:    firm.name,
      activeDeals: activeDeals.length,
      newDeals,
      movedDeals,
      staleDeals,
    })

    try {
      await resend.emails.send({
        from:    FROM,
        to:      emails,
        subject: SUBJECT,
        html,
      })
      results.push({ firm: firm.name, emails, status: 'sent' })
    } catch (err: any) {
      results.push({ firm: firm.name, emails, status: `error: ${err.message}` })
    }
  }

  return NextResponse.json({ ok: true, results })
}
