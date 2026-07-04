import SourcingWorkspace from '@/components/sourcing/SourcingWorkspace'
import { createClient } from '@/lib/supabase/server'

export default async function SourcingPage() {
  const supabase = await createClient()
  const { data: opportunities } = await supabase.from('sourcing_opportunities').select('*').order('created_at', { ascending: false }).limit(200)
  const active = (opportunities ?? []).filter((item) => !['dismissed', 'promoted'].includes(item.status)).length
  const matches = (opportunities ?? []).filter((item) => item.match_score != null && item.match_score >= 70).length
  const duplicates = (opportunities ?? []).filter((item) => item.possible_duplicate_deal_id).length

  return (
    <div className="app-page">
      <div className="app-page-header"><p className="app-eyebrow">Sourcing</p><h1 className="app-title">Property Finder</h1><p className="app-subtitle">Bring permitted opportunities into the same buy-box, underwriting, and decision loop.</p></div>
      <div className="app-stat-grid app-stat-grid-3"><div className="app-stat-card"><strong>{active}</strong><span>Active opportunities</span></div><div className="app-stat-card"><strong>{matches}</strong><span>High buy-box matches</span></div><div className="app-stat-card"><strong>{duplicates}</strong><span>Already in firm memory</span></div></div>
      <SourcingWorkspace initialOpportunities={opportunities ?? []} />
    </div>
  )
}
