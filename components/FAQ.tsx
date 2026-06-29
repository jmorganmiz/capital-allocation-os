'use client'

import { useState } from 'react'

const FAQS = [
  {
    q: 'How does the free trial work?',
    a: 'You get 30 days free — no credit card required. Your whole team can use every feature from day one. At the end of the trial you can subscribe or export your data.',
  },
  {
    q: 'How does the AI parse offering memorandums?',
    a: 'Forward a broker email with an attached PDF to your firm\'s unique inbox address. Dealstash extracts the deal name, market, asset type, key financials, and scores it against your buy box automatically — typically within a minute.',
  },
  {
    q: 'What is a buy box?',
    a: 'A buy box is a set of rules that defines your ideal acquisition criteria — asset types, markets, unit counts, price ranges, cap rates, and more. Dealstash uses your buy box to score every incoming deal so you can prioritize quickly.',
  },
  {
    q: 'Can I import our existing deal history?',
    a: 'Yes. The CSV import wizard lets you map columns from any spreadsheet into Dealstash deals in a few minutes. It handles messy headers and previews the data before you commit.',
  },
  {
    q: 'Is our deal data private?',
    a: 'Your data is isolated to your firm. No other firm can see your deals, contacts, notes, or scoring criteria. Data is encrypted at rest and in transit.',
  },
  {
    q: 'How many users are included?',
    a: 'Unlimited. The $149/month price covers your entire team — analysts, associates, principals, and partners. No per-seat charges.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Cancel from the billing settings at any time. You keep access through the end of your billing period and can export your data before it expires.',
  },
]

export function FAQ() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section className="section reveal" id="faq">
      <div className="sec-eye">FAQ</div>
      <h2 className="sec-title">Common <strong>questions</strong></h2>

      <div style={{
        maxWidth: '680px',
        marginTop: '48px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0',
        border: '1px solid rgba(112,112,125,0.18)',
        borderRadius: '8px',
        overflow: 'hidden',
      }}>
        {FAQS.map((faq, i) => {
          const isOpen = open === i
          return (
            <div
              key={i}
              style={{
                borderTop: i > 0 ? '1px solid rgba(112,112,125,0.12)' : 'none',
              }}
            >
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  padding: '20px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  textAlign: 'left',
                }}
              >
                <span style={{
                  fontSize: '15px',
                  fontWeight: 500,
                  color: isOpen ? 'var(--starlight)' : 'var(--silver)',
                  transition: 'color 0.15s',
                  lineHeight: 1.4,
                }}>
                  {faq.q}
                </span>
                <span style={{
                  flexShrink: 0,
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: '1px solid rgba(112,112,125,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--lead)',
                  fontSize: '14px',
                  lineHeight: 1,
                  transition: 'transform 0.2s, border-color 0.15s',
                  transform: isOpen ? 'rotate(45deg)' : 'none',
                }}>
                  +
                </span>
              </button>

              {isOpen && (
                <div style={{
                  padding: '0 24px 20px',
                  color: 'var(--silver)',
                  fontSize: '14px',
                  lineHeight: 1.7,
                }}>
                  {faq.a}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
