import Link from 'next/link'

export function Pricing() {
  return (
    <section className="section reveal price-wrap" id="pricing">
      <div className="sec-eye">Pricing</div>
      <h2 className="sec-title">One price. <strong>Your whole firm.</strong></h2>
      <p className="sec-sub">Less than one hour of an analyst&apos;s time. More useful than a month of it.</p>

      <div className="pcard">
        <div className="price-label">Per firm · per month</div>
        <div className="price-amount"><sup>$</sup>149</div>
        <div className="price-per">/ month · billed monthly</div>
        <ul className="pfeatures">
          <li>Unlimited users — your whole team</li>
          <li>Unlimited deals &amp; pipeline stages</li>
          <li>AI OM parsing &amp; buy box scoring</li>
          <li>Deal graveyard &amp; decision log</li>
          <li>Similar deals engine</li>
          <li>AI analyst — query your deal history</li>
          <li>Firm deal inbox</li>
        </ul>
        <Link className="btn-primary-full" href="/signup">Start 30-day free trial →</Link>
        <p className="price-note">No credit card required · Setup in 5 minutes · Cancel anytime</p>
      </div>
    </section>
  )
}
