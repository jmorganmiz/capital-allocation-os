export function SocialProof() {
  return (
    <section className="social-proof reveal" aria-labelledby="social-proof-title">
      <div className="proof-logos" aria-label="Built for acquisition teams at CRE firms">
        <span>Acquisition teams</span>
        <span>Private equity</span>
        <span>Family offices</span>
        <span>Independent sponsors</span>
      </div>
      <figure className="proof-quote">
        <blockquote id="social-proof-title">
          “The value is not another pipeline. It is remembering why every deal lived or died before the next OM hits the inbox.”
        </blockquote>
        <figcaption>CRE acquisitions operator · Dallas multifamily</figcaption>
      </figure>
    </section>
  )
}
