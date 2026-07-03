'use client'

import { useEffect } from 'react'
import { Nav } from '@/components/Nav'
import { Hero } from '@/components/Hero'
import { SocialProof } from '@/components/SocialProof'
import { HowItWorks } from '@/components/HowItWorks'
import { ProductDemo } from '@/components/ProductDemo'
import { UnderwritingShowcase } from '@/components/UnderwritingShowcase'
import { Features } from '@/components/Features'
import { Pricing } from '@/components/Pricing'
import { TrustBar } from '@/components/TrustBar'
import { FAQ } from '@/components/FAQ'
import { FooterCTA } from '@/components/FooterCTA'
import { SiteFooter } from '@/components/SiteFooter'
import { CookieBanner } from '@/components/CookieBanner'
import { LandingAnalyst } from '@/components/LandingAnalyst'

export default function HomePage() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal, .reveal-stagger')
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible')
          obs.unobserve(e.target)
        }
      })
    }, { threshold: 0.08 })

    els.forEach(el => obs.observe(el))

    const score = document.querySelector('.fc-score') as HTMLElement | null
    if (score) score.style.transform = 'translateX(-50%)'

    return () => obs.disconnect()
  }, [])

  return (
    <div className="landing-page">
      <Nav />
      <Hero />
      <SocialProof />
      <HowItWorks />
      <hr className="divider" />
      <ProductDemo />
      <hr className="divider" />
      <UnderwritingShowcase />
      <hr className="divider" />
      <Features />
      <hr className="divider" />
      <TrustBar />
      <hr className="divider" />
      <Pricing />
      <hr className="divider" />
      <FAQ />
      <hr className="divider" />
      <FooterCTA />
      <SiteFooter />
      <CookieBanner />
      <LandingAnalyst />
    </div>
  )
}
