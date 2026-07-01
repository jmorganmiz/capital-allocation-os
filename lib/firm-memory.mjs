const REUSABLE_TYPES = new Set(['saved', 'correction', 'firm_rule'])

export function memoryTerms(value) {
  return String(value ?? '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(term => term.length >= 4)
}

export function rankRelevantMemories(question, memories, limit = 3) {
  const terms = memoryTerms(question)

  return memories
    .filter(memory => REUSABLE_TYPES.has(memory.feedback_type))
    .map(memory => {
      const content = `${memory.content ?? ''} ${(memory.tags ?? []).join(' ')}`.toLowerCase()
      const matches = terms.reduce((sum, term) => sum + (content.includes(term) ? 1 : 0), 0)
      const boost = memory.feedback_type === 'firm_rule'
        ? 3
        : memory.feedback_type === 'correction'
          ? 2
          : 1
      return { memory, matches, relevance: matches + boost }
    })
    .filter(item => item.matches > 0)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit)
    .map(item => item.memory)
}

export function approvedScoringRules(memories, limit = 20) {
  return memories
    .filter(memory => memory.feedback_type === 'firm_rule')
    .slice(0, limit)
    .map(memory => String(memory.content ?? '').trim())
    .filter(Boolean)
}
