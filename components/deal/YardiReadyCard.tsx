import { buildYardiReadiness } from '@/lib/yardi-readiness'

type Props = Parameters<typeof buildYardiReadiness>[0] & {
  dealId: string
}

export default function YardiReadyCard(props: Props) {
  const readiness = buildYardiReadiness(props)
  const includedSheets = [
    'Deal Summary',
    'Financials',
    'Scoring',
    'Notes & Risks',
    'Files & Activity',
    'Readiness',
  ]

  return (
    <div className="app-deal-rail-card app-yardi-card" data-ready={readiness.ready}>
      <div className="app-deal-rail-header">
        <div>
          <p>Export readiness</p>
          <h3>Export-ready record</h3>
        </div>
        <span>{readiness.score}%</span>
      </div>

      <div className="app-yardi-meter" aria-label={`${readiness.completeCount} of ${readiness.totalCount} export-ready fields complete`}>
        <div style={{ width: `${readiness.score}%` }} />
      </div>

      <p className="app-yardi-summary">
        {readiness.ready
          ? 'Clean export record. This deal has the core fields, decision context, documents, and review trail.'
          : `${readiness.completeCount} of ${readiness.totalCount} fields complete. Finish the missing items before calling this export-ready.`}
      </p>

      <div className="app-yardi-list">
        {readiness.items.map((item) => (
          <div key={item.key} data-complete={item.complete}>
            <span>{item.complete ? '\u2713' : '!'}</span>
            <div>
              <strong>{item.label}</strong>
              <small>{item.complete ? item.value || 'Captured' : item.help}</small>
            </div>
          </div>
        ))}
      </div>

      <div className="app-export-preview">
        <strong>Workbook preview</strong>
        <p>{includedSheets.length} tabs: {includedSheets.join(', ')}.</p>
        <small>{readiness.missing.length ? `Missing before fully ready: ${readiness.missing.join(', ')}.` : 'No readiness gaps detected.'}</small>
      </div>

      <div className="app-export-actions">
        <a className="app-yardi-export" href={`/api/deals/${props.dealId}/export/xlsx`}>
          Export XLSX
        </a>
        <a className="app-yardi-export app-yardi-export-secondary" href={`/api/deals/${props.dealId}/export`}>
          CSV
        </a>
      </div>
    </div>
  )
}
