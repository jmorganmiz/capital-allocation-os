export type MemoryLike = {
  id?: string
  content: string
  feedback_type: string
  tags?: string[]
}

export function memoryTerms(value: unknown): string[]
export function rankRelevantMemories<T extends MemoryLike>(question: string, memories: T[], limit?: number): T[]
export function approvedScoringRules<T extends MemoryLike>(memories: T[], limit?: number): string[]
