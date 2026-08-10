import { buildUnderwritingReadiness } from '@/lib/underwriting-readiness'
import type { UnderwritingAssumption, UnderwritingRun, UnderwritingStep } from '@/lib/types/database'

type Props = {
  notes: Array<{ section: string | null; content: string | null }>
  files: Array<{ id?: string | null }>
  quickRuns: UnderwritingRun[]
  preflightRun: UnderwritingRun | null
  preflightSteps: UnderwritingStep[]
  preflightAssumptions: UnderwritingAssumption[]
  fullRun: UnderwritingRun | null
  fullSteps: UnderwritingStep[]
}

function formatUpdated(value: string | null) {
  if (!value) return 'No underwriting activity yet'
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export default function UnderwritingReliabilityPanel(props: Props) {
  const readiness = buildUnderwritingReadiness(props)

  return (
    <section className="app-uw-health" aria-label="Underwriting status and readiness">
      <header className="app-uw-health-header">
        <div>
          <p>Underwriting control</p>
          <h2>Run health</h2>
          <small>{readiness.readyCount} of {readiness.totalCount} readiness checks complete. Last update: {formatUpdated(readiness.lastUpdatedAt)}.</small>
        </div>
        <strong>{readiness.nextAction}</strong>
      </header>

      <div className="app-uw-health-cards">
        <article className="app-uw-health-card" data-status={readiness.preflightStatus}>
          <span>Preflight</span>
          <strong>{readiness.preflightLabel}</strong>
          <p>Reviews source docs, assumptions, risk narrative, and locks the analyst-approved package.</p>
        </article>
        <article className="app-uw-health-card" data-status={readiness.fullStatus}>
          <span>Full Underwrite</span>
          <strong>{readiness.fullLabel}</strong>
          <p>Runs the deterministic model only after the preflight package is approved.</p>
        </article>
      </div>

      {readiness.failureTitle && (
        <div className="app-uw-health-failure" role="status">
          <div>
            <strong>{readiness.failureTitle}</strong>
            <p>{readiness.failureMessage ?? 'The underwriting worker stopped before the package finished.'}</p>
            {readiness.retryCopy && <small>{readiness.retryCopy}</small>}
          </div>
          {readiness.supportCode && <code>{readiness.supportCode}</code>}
        </div>
      )}

      <div className="app-uw-ready-list">
        {readiness.items.map((item) => (
          <article key={item.key} className="app-uw-ready-item" data-complete={item.complete}>
            <span>{item.complete ? 'Done' : 'Open'}</span>
            <div>
              <strong>{item.label}</strong>
              <p>{item.helper}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
