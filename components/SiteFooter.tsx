import Link from 'next/link'

export function SiteFooter() {
  return (
    <footer className="site-footer" aria-label="Site footer">
      <div className="footer-brand">
        <div className="logo">deal<span>stash</span></div>
        <p>Deal memory and pipeline automation for CRE acquisition teams.</p>
      </div>
      <nav className="footer-links" aria-label="Footer navigation">
        <Link href="/login">Sign in</Link>
        <Link href="/privacy">Privacy Policy</Link>
        <Link href="/terms">Terms</Link>
        <a href="mailto:hello@getdealstash.com">hello@getdealstash.com</a>
      </nav>
      <p className="footer-legal">© 2026 Dealstash. All rights reserved.</p>
    </footer>
  )
}
