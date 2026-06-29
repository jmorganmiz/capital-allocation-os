'use client'

import { useEffect } from 'react'
import { Nav } from '@/components/Nav'
import { Hero } from '@/components/Hero'
import { HowItWorks } from '@/components/HowItWorks'
import { Features } from '@/components/Features'
import { Pricing } from '@/components/Pricing'
import { FooterCTA } from '@/components/FooterCTA'

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
      <HowItWorks />
      <hr className="divider" />
      <Features />
      <hr className="divider" />
      <Pricing />
      <hr className="divider" />
      <FooterCTA />
    </div>
  )
}
