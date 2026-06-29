import Link from 'next/link'

export function Nav() {
  return (
    <nav>
      <div className="logo">deal<span>stash</span></div>
      <ul className="nav-links">
        <li><a href="#how">How it works</a></li>
        <li><a href="#features">Features</a></li>
        <li><a href="#pricing">Pricing</a></li>
        <li><a href="/demo">Demo</a></li>
      </ul>
      <Link className="nav-btn" href="/signup">Start free →</Link>
    </nav>
  )
}
