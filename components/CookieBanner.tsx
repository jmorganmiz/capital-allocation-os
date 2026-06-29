'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const key = 'dealstash-cookie-notice'

export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(window.localStorage.getItem(key) !== 'accepted')
  }, [])

  function accept() {
    window.localStorage.setItem(key, 'accepted')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="cookie-banner" role="region" aria-label="Cookie and privacy notice">
      <p>
        We use essential cookies and privacy-conscious analytics to understand site performance.
        Read the <Link href="/privacy">Privacy Policy</Link>.
      </p>
      <button type="button" onClick={accept}>Accept</button>
    </div>
  )
}
