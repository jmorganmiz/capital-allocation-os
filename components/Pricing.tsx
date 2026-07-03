import Link from 'next/link'

const plans = [
  {
    name: 'Deal Memory',
    price: '149',
    description: 'The operating memory for a focused acquisitions team.',
    features: [
      'Firm inbox, OM parsing, and pipeline',
      'Buy-box scoring and decision history',
      'Graveyard, similar deals, and contacts',
      'AI Analyst grounded in firm records',
      'Learning loops and approved firm rules',
      'Unlimited deals',
    ],
    action: <Link className="btn-primary-full" href="/signup">Start 30-day free trial →</Link>,
  },
  {
    name: 'Underwriting Pro',
    price: '399',
    description: 'Evidence-backed underwriting from first pencil to IC package.',
    badge: 'Private beta',
    features: [
      'Everything in Deal Memory',
      'Unlimited deterministic Quick Pencils',
      '25 completed Full Underwrites / month',
      'Two included revisions per underwrite',
      'Cited document extraction and approvals',
      'Sensitivity tables and IC memo PDF',
    ],
    action: <a className="btn-primary-full" href="mailto:hello@getdealstash.com?subject=Underwriting%20Pro%20beta">Request beta access →</a>,
  },
]

export function Pricing() {
  return (
    <section className="section reveal price-wrap" id="pricing">
      <div className="sec-eye">Pricing</div>
      <h2 className="sec-title">Pay for a finished workflow. <strong>Not token math.</strong></h2>
      <p className="sec-sub">Start with permanent deal memory. Add reviewable underwriting when your team is ready.</p>

      <div className="pricing-grid">
        {plans.map((plan) => (
          <div className={`pcard ${plan.badge ? 'featured' : ''}`} key={plan.name}>
            {plan.badge && <span className="price-badge">{plan.badge}</span>}
            <div className="price-label">{plan.name}</div>
            <div className="price-amount"><sup>$</sup>{plan.price}</div>
            <div className="price-per">per firm · per month</div>
            <p className="price-description">{plan.description}</p>
            <ul className="pfeatures">
              {plan.features.map((feature) => <li key={feature}>{feature}</li>)}
            </ul>
            {plan.action}
          </div>
        ))}
      </div>
      <p className="pricing-footnote">Full Underwrites count only when completed. Failed or canceled runs do not use the allowance. Provider usage is never exposed as customer-facing tokens.</p>
    </section>
  )
}
