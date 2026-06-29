import Link from 'next/link'

export function FooterCTA() {
  return (
    <div className="footer-cta reveal">
      <h2>Your firm sees hundreds of deals.<br /><strong>Start remembering all of them.</strong></h2>
      <p>The longer you use Dealstash, the smarter your firm gets. Every deal logged is institutional knowledge your team keeps forever.</p>
      <Link className="btn-primary footer-primary" href="/signup">Start free — no credit card required</Link>
      <p style={{ marginTop: '16px', fontSize: '13px', color: 'var(--lead)' }}>$149/mo after trial · Cancel anytime</p>
    </div>
  )
}
