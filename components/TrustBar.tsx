export function TrustBar() {
  return (
    <section className="trust-bar reveal" aria-labelledby="trust-title">
      <div>
        <div className="sec-eye">Security</div>
        <h2 id="trust-title">Built for confidential deal flow.</h2>
      </div>
      <div className="trust-grid">
        <div>
          <h3>Encrypted in transit</h3>
          <p>Deal data moves over HTTPS/TLS. Production access is limited to authenticated users.</p>
        </div>
        <div>
          <h3>Firm-scoped records</h3>
          <p>Pipeline, graveyard, contacts, and import data are scoped to your firm workspace.</p>
        </div>
        <div>
          <h3>Operational controls</h3>
          <p>Billing, onboarding, and critical endpoints fail closed and are covered by automated checks.</p>
        </div>
      </div>
    </section>
  )
}
