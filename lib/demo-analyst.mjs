const INTENTS = [
  {
    id: 'broker',
    terms: ['broker', 'marcus', 'cbre', 'source', 'seen before'],
    label: 'Broker memory',
    answer: 'Yes. In this sample firm, Marcus Webb at CBRE has sent 5 deals. One advanced to LOI and four were killed: two on price, one on deferred maintenance, and one on tenant rollover. His deals average 67/100.',
  },
  {
    id: 'market',
    terms: ['market', 'dallas', 'buy box', 'failing', 'fail', 'cap rate'],
    label: 'Pattern found',
    answer: 'Dallas is the sample firm\'s highest-friction market: 9 of 14 recent deals missed the buy box. Seven were below the 6% cap-rate floor, and asking prices are roughly 18% above the firm\'s Q3 basis.',
  },
  {
    id: 'similar',
    terms: ['similar', 'compare', '4810', 'gaston', 'seen this'],
    label: '3 similar deals',
    answer: '4810 Gaston Ave scores 82/100, versus 66/100 across three similar Dallas multifamily deals. Two similar deals were killed below a 6% cap rate; Oak Cliff 12-Unit advanced at a revised basis and scored 79.',
  },
  {
    id: 'price',
    terms: ['price', 'killed', 'graveyard', 'too high'],
    label: 'Decision memory',
    answer: 'The sample Graveyard contains 7 pricing kills. Garland Flats, East Dallas 16, and Mesquite 8-Unit missed the firm\'s price-per-unit target by 11-18%. Each decision and its original note remain searchable.',
  },
  {
    id: 'om',
    terms: ['om', 'offering memorandum', 'summarize', 'summary', 'upload'],
    label: 'OM summary',
    answer: 'Sample summary: 4810 Gaston Ave is a 12-unit value-add multifamily property asking $1.05M. In-place NOI is $65,100, cap rate is 6.2%, and the deal scores 82/100. First checks: rent-roll quality, deferred maintenance, and post-renovation rent assumptions.',
  },
  {
    id: 'security',
    terms: ['security', 'private', 'privacy', 'data', 'safe'],
    label: 'Data boundary',
    answer: 'This public demo uses fictional sample data only. Signed-in Dealstash workspaces are firm-scoped, and the in-app Analyst can read only the authenticated firm\'s records and approved memories.',
  },
  {
    id: 'pricing',
    terms: ['pricing', 'cost', 'price plan', 'trial', 'users'],
    label: 'Plan details',
    answer: 'Dealstash is $149 per month with unlimited users and a free trial. The product includes OM intake, pipeline management, scoring, Graveyard memory, similar-deal recall, and the in-app AI Analyst.',
  },
]

export const demoPrompts = [
  'Have we seen this broker before?',
  'Why do Dallas deals fail the buy box?',
  'Compare 4810 Gaston to similar deals',
  'Summarize this OM',
]

function intentScore(question, intent) {
  const normalized = question.toLowerCase()
  return intent.terms.reduce((score, term) => score + (normalized.includes(term) ? term.split(' ').length : 0), 0)
}

export function answerDemoQuestion(question) {
  const ranked = INTENTS
    .map(intent => ({ intent, score: intentScore(question, intent) }))
    .sort((a, b) => b.score - a.score)
  const match = ranked[0]?.score > 0 ? ranked[0].intent : null

  return {
    intent: match?.id ?? 'fallback',
    answer: match?.answer ?? 'I can demonstrate how Dealstash recalls broker history, compares similar deals, explains buy-box failures, summarizes OMs, and preserves kill decisions. Try asking one of the prompts below.',
    label: match?.label ?? 'Demo analyst',
  }
}
