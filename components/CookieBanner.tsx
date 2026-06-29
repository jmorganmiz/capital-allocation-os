'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const key = 'dealstash-cookie-notice'

export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(!window.localStorage.getItem(key))
  }, [])

  function dismiss(choice: 'accepted' | 'declined') {
    window.localStorage.setItem(key, choice)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="cookie-banner" role="region" aria-label="Cookie and privacy notice">
      <p>
        We use essential cookies and privacy-conscious analytics to understand site performance.
        Read the <Link href="/privacy">Privacy Policy</Link>.
      </p>
      <div className="cookie-actions">
        <button type="button" className="cookie-decline" onClick={() => dismiss('declined')}>Decline</button>
        <button type="button" onClick={() => dismiss('accepted')}>Accept</button>
      </div>
    </div>
  )
}
