import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assertFirmAccess } from '@/lib/billing-access'

const ALLOWED_TYPES = new Set(['saved', 'helpful', 'not_helpful', 'correction', 'firm_rule'])

function tagsFrom(question: string, content: string) {
  const text = `${question} ${content}`.toLowerCase()
  const tags = new Set<string>()
  for (const tag of ['pricing', 'broker', 'source', 'stale', 'pipeline', 'graveyard', 'killed', 'similar', 'market', 'score']) {
    if (text.includes(tag)) tags.add(tag)
  }
  return [...tags].slice(0, 8)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single()

  if (!profile?.firm_id) return NextResponse.json({ error: 'Firm not found' }, { status: 403 })

  const accessError = await assertFirmAccess(supabase, profile.firm_id)
  if (accessError) return NextResponse.json({ error: accessError }, { status: 402 })

  const body = await request.json().catch(() => ({}))
  const sourceQuestion = typeof body.question === 'string' ? body.question.slice(0, 500) : null
  const sourceAnswer = typeof body.answer === 'string' ? body.answer.slice(0, 4000) : null
  const content = typeof body.content === 'string' ? body.content.trim().slice(0, 4000) : ''
  const feedbackType = typeof body.feedbackType === 'string' && ALLOWED_TYPES.has(body.feedbackType)
    ? body.feedbackType
    : 'saved'

  if (!content) return NextResponse.json({ error: 'Memory content is required' }, { status: 400 })

  const { data, error } = await supabase
    .from('firm_memories')
    .insert({
      firm_id: profile.firm_id,
      source_question: sourceQuestion,
      source_answer: sourceAnswer,
      content,
      feedback_type: feedbackType,
      tags: tagsFrom(sourceQuestion ?? '', content),
      created_by: user.id,
    })
    .select('id, source_question, content, feedback_type, tags, created_at, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ memory: data })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('firm_id').eq('id', user.id).single()
  if (!profile?.firm_id) return NextResponse.json({ error: 'Firm not found' }, { status: 403 })

  const accessError = await assertFirmAccess(supabase, profile.firm_id)
  if (accessError) return NextResponse.json({ error: accessError }, { status: 402 })

  const body = await request.json().catch(() => ({}))
  const id = typeof body.id === 'string' ? body.id : ''
  const content = typeof body.content === 'string' ? body.content.trim().slice(0, 4000) : ''
  const feedbackType = typeof body.feedbackType === 'string' && ALLOWED_TYPES.has(body.feedbackType)
    ? body.feedbackType
    : null

  if (!id || !content || !feedbackType) {
    return NextResponse.json({ error: 'Memory id, content, and type are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('firm_memories')
    .update({
      content,
      feedback_type: feedbackType,
      tags: tagsFrom('', content),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('firm_id', profile.firm_id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ memory: data })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('firm_id').eq('id', user.id).single()
  if (!profile?.firm_id) return NextResponse.json({ error: 'Firm not found' }, { status: 403 })

  const accessError = await assertFirmAccess(supabase, profile.firm_id)
  if (accessError) return NextResponse.json({ error: accessError }, { status: 402 })

  const body = await request.json().catch(() => ({}))
  const id = typeof body.id === 'string' ? body.id : ''
  if (!id) return NextResponse.json({ error: 'Memory id is required' }, { status: 400 })

  const { error } = await supabase
    .from('firm_memories')
    .delete()
    .eq('id', id)
    .eq('firm_id', profile.firm_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
