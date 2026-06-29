import Link from 'next/link'

export function Nav() {
  return (
    <nav aria-label="Primary navigation">
      <Link className="logo" href="/">deal<span>stash</span></Link>
      <ul className="nav-links">
        <li><a href="#how">Workflow</a></li>
        <li><a href="#demo">Product demo</a></li>
        <li><a href="#features">Features</a></li>
        <li><a href="#pricing">Pricing</a></li>
        <li><Link href="/login">Sign in</Link></li>
      </ul>
      <Link className="nav-btn" href="/signup" aria-label="Start a free Dealstash trial">Start free →</Link>
    </nav>
  )
}
