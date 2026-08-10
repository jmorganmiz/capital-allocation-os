import { buildExportReadiness } from '@/lib/export-readiness'

type Props = Parameters<typeof buildExportReadiness>[0] & {
  dealId: string
}

export default function ExportReadyCard(props: Props) {
  const readiness = buildExportReadiness(props)
  const includedSheets = [
    'Deal Summary',
    'Financials',
    'Scoring',
    'Notes & Risks',
    'Files & Activity',
    'Readiness',
  ]

  return (
    <div className="app-deal-rail-card app-export-ready-card" data-ready={readiness.ready}>
      <div className="app-deal-rail-header">
        <div>
          <p>Export readiness</p>
          <h3>Export-ready record</h3>
        </div>
        <span>{readiness.score}%</span>
      </div>

      <div className="app-export-ready-meter" aria-label={`${readiness.completeCount} of ${readiness.totalCount} export-ready fields complete`}>
        <div style={{ width: `${readiness.score}%` }} />
      </div>

      <p className="app-export-ready-summary">
        {readiness.ready
          ? 'Clean export record. This deal has the core fields, decision context, documents, and review trail.'
          : `${readiness.completeCount} of ${readiness.totalCount} fields complete. Finish the missing items before calling this export-ready.`}
      </p>

      <div className="app-export-ready-list">
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
        <a className="app-export-ready-action" href={`/api/deals/${props.dealId}/export/xlsx`}>
          Export XLSX
        </a>
        <a className="app-export-ready-action app-export-ready-action-secondary" href={`/api/deals/${props.dealId}/export`}>
          CSV
        </a>
      </div>
    </div>
  )
}
