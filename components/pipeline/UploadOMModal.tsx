'use client'

import { useState, useRef, useTransition } from 'react'
import { Deal, DealStage } from '@/lib/types/database'
import { createClient } from '@/lib/supabase/client'
import { createDealFromUpload, createDealFromOM } from '@/lib/actions/deals'

interface ParsedOM {
  address: string | null
  asking_price: number | null
  noi: number | null
  cap_rate: number | null
  property_type: string | null
  square_footage: number | null
  year_built: number | null
  num_units: number | null
  occupancy_rate: number | null
  broker_name: string | null
  brokerage: string | null
  market: string | null
}

type Step = 'select' | 'analyzing' | 'preview'

interface Props {
  stages: DealStage[]
  existingDeals: Deal[]
  onCreated: (deal: Deal) => void
  onCancel: () => void
}

const PROPERTY_TYPE_MAP: Record<string, string> = {
  multifamily:  'Multifamily',
  retail:       'Retail',
  office:       'Office',
  industrial:   'Industrial',
  hospitality:  'Hospitality',
  self_storage: 'Self Storage',
  mixed_use:    'Mixed Use',
  land:         'Land',
  other:        'Other',
}

function formatCurrency(val: number): string {
  return val.toLocaleString('en-US')
}

function parseCurrency(val: string): number | null {
  const cleaned = val.replace(/[$,\s]/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

function cleanFilename(filename: string): string {
  return filename
    .replace(/\.pdf$/i, '')          // strip extension
    .replace(/[-_]/g, ' ')           // dashes/underscores → spaces
    .replace(/\bOM\b/gi, '')         // remove standalone "OM"
    .replace(/\s*\([^)]*\)\s*/g, ' ')// remove (Interactive) and similar
    .replace(/\s+/g, ' ')            // collapse multiple spaces
    .trim()
}


export default function UploadOMModal({ stages, existingDeals, onCreated, onCancel }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [mode, setMode] = useState<'new' | 'existing'>('new')
  const [existingDealId, setExistingDealId] = useState('')
  const [step, setStep] = useState<Step>('select')
  const [parsedOM, setParsedOM] = useState<ParsedOM | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)

  // Editable preview fields
  const [title, setTitle] = useState('')
  const [market, setMarket] = useState('')
  const [dealType, setDealType] = useState('')
  const [sourceName, setSourceName] = useState('')
  const [askingPrice, setAskingPrice] = useState('')
  const [noi, setNoi] = useState('')
  const [capRate, setCapRate] = useState('')
  const [addBroker, setAddBroker] = useState(false)

  // Storage path set by analyzeFile so handleConfirm can reuse it (avoid double-upload)
  const [tempStoragePath, setTempStoragePath] = useState<string | null>(null)

  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  const isLoading = uploading || isPending

  async function analyzeFile(f: File) {
    console.log('[OM] analyzeFile called, file:', f.name, f.size, 'bytes')
    setStep('analyzing')
    setParseError(null)
    setTempStoragePath(null)
    const nameFromFile = cleanFilename(f.name)
    setTitle(nameFromFile)

    // ── Step 1: upload to Supabase Storage (avoids Vercel payload limit) ──
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setParseError('Not authenticated. Please refresh and try again.')
      setStep('select')
      return
    }
    const { data: profile } = await supabase.from('profiles').select('firm_id').single()
    if (!profile) {
      setParseError('Profile not found. Please refresh and try again.')
      setStep('select')
      return
    }

    const storageKey = `${profile.firm_id}/om-parse/${Date.now()}_${f.name}`
    console.log('[OM] uploading to storage:', storageKey)
    const { error: uploadErr } = await supabase.storage.from('deal-files').upload(storageKey, f)
    if (uploadErr) {
      console.error('[OM] storage upload failed:', uploadErr.message)
      setParseError(`Upload failed: ${uploadErr.message}`)
      setStep('select')
      return
    }
    setTempStoragePath(storageKey)
    console.log('[OM] storage upload done, calling parse-om API...')

    // ── Step 2: call parse-om with the storage path (no file bytes in body) ──
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 90_000)

    let res: Response
    try {
      res = await fetch('/api/parse-om', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storagePath: storageKey }),
        signal: controller.signal,
      })
      console.log('[OM] parse-om response status:', res.status, res.ok)
    } catch (err: unknown) {
      clearTimeout(timeoutId)
      if (err instanceof Error && err.name === 'AbortError') {
        console.warn('[OM] fetch timed out')
        setParseError("AI analysis timed out — the PDF may be too large. Please fill in details manually.")
      } else {
        console.error('[OM] fetch failed (network error):', err)
        setParseError("Couldn't reach the server. Check your connection and try again.")
      }
      setStep('select')
      return
    }
    clearTimeout(timeoutId)

    // Parse JSON separately so a non-JSON response (HTML error page) is caught cleanly
    let json: { data?: ParsedOM; error?: string }
    try {
      json = await res.json()
      console.log('[OM] parse-om JSON response:', json)
    } catch (err) {
      console.error('[OM] res.json() failed — server returned non-JSON:', err)
      setParseError("Received an unexpected response from the server. Please try again.")
      setStep('select')
      return
    }

    if (!res.ok || json.error) {
      console.warn('[OM] API returned error:', json.error, '| status:', res.status)
      const msg =
        json.error === 'pdf_too_large'
          ? 'This PDF is too large to analyze automatically (max 20 MB). Please fill in details manually.'
          : json.error === 'api_key_missing'
          ? 'AI extraction is not configured on this server. Please fill in details manually.'
          : "Couldn't extract data automatically — please fill in manually."
      setParseError(msg)
      setStep('select')
      return
    }

    const data = json.data
    if (!data || typeof data !== 'object') {
      console.warn('[OM] json.data is empty or not an object:', data)
      setParseError("Received empty data from AI — please fill in manually.")
      setStep('select')
      return
    }

    console.log('[OM] Extracted data:', data)
    setParsedOM(data)
    setTitle(data.address || nameFromFile)
    setMarket(data.market || '')
    setDealType(PROPERTY_TYPE_MAP[data.property_type ?? ''] || '')
    // Combine broker_name + brokerage into source_name (e.g. "John Smith / CBRE")
    const brokerParts = [data.broker_name, data.brokerage].filter(Boolean)
    setSourceName(brokerParts.join(' / '))
    setAskingPrice(data.asking_price ? formatCurrency(data.asking_price) : '')
    setNoi(data.noi ? formatCurrency(data.noi) : '')
    setCapRate(data.cap_rate ? (data.cap_rate * 100).toFixed(2) : '')
    setAddBroker(!!data.broker_name)
    console.log('[OM] Setting step to preview')
    setStep('preview')
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    console.log('[OM] handleFileSelect, file:', f?.name, 'mode:', mode)
    if (!f) return
    // Reset so selecting the same file again still fires onChange
    e.target.value = ''
    setFile(f)
    if (mode === 'new') {
      analyzeFile(f)
    }
  }

  function handleModeChange(next: 'new' | 'existing') {
    setMode(next)
    setStep('select')
    setParseError(null)
    setError(null)
    setTempStoragePath(null)
  }

  async function handleConfirm() {
    console.log('[OM] handleConfirm called, title:', title, 'file:', file?.name)
    if (!file) { setError('Please select a file.'); return }
    if (!title.trim()) { setError('Deal name is required.'); return }

    setUploading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not authenticated'); setUploading(false); return }

    const { data: profile } = await supabase.from('profiles').select('firm_id').single()
    if (!profile) { setError('Profile not found'); setUploading(false); return }

    // Reuse the temp path from analyzeFile if available — avoids a second upload
    let storagePath = tempStoragePath
    if (!storagePath) {
      storagePath = `${profile.firm_id}/new/${Date.now()}_${file.name}`
      const { error: storageError } = await supabase.storage
        .from('deal-files')
        .upload(storagePath, file)
      if (storageError) { setError(storageError.message); setUploading(false); return }
    }

    const capRateNum = capRate ? parseFloat(capRate) / 100 : null

    startTransition(async () => {
      console.log('[OM] createDealFromOM called with:', { title: title.trim(), market, dealType, sourceName })
      try {
        const result = await createDealFromOM({
          title:       title.trim(),
          address:     parsedOM?.address ?? null,
          market:      market.trim() || null,
          deal_type:   dealType.trim() || null,
          source_name: sourceName.trim() || null,
          storagePath,
          filename:    file.name,
          mimeType:    file.type || 'application/pdf',
          sizeBytes:   file.size,
          stageId:     stages[0]?.id ?? '',
          financials: {
            asking_price: parseCurrency(askingPrice),
            noi:          parseCurrency(noi),
            cap_rate:     capRateNum !== null && !isNaN(capRateNum) ? capRateNum : null,
          },
          // Use the raw AI-extracted broker name for the contact (not the combined source_name)
          addBrokerContact: addBroker && !!(parsedOM?.broker_name ?? sourceName.trim()),
          brokerName:       parsedOM?.broker_name ?? null,
          brokerCompany:    parsedOM?.brokerage ?? null,
          propertyDetails: {
            square_footage: parsedOM?.square_footage ?? null,
            year_built:     parsedOM?.year_built ?? null,
            num_units:      parsedOM?.num_units ?? null,
            occupancy_rate: parsedOM?.occupancy_rate ?? null,
          },
        })

        console.log('[OM] createDealFromOM result:', result)
        if (result.error) {
          setError(result.error)
        } else if (result.deal) {
          console.log('[OM] Deal created successfully:', result.deal.id)
          onCreated(result.deal as Deal)
          return
        }
      } catch (err) {
        console.error('[OM] createDealFromOM threw:', err)
        setError('Something went wrong. Please try again.')
      }
      setUploading(false)
    })
  }

  async function handleExistingSubmit() {
    if (!file) { setError('Please select a file.'); return }
    if (!existingDealId) { setError('Please select a deal.'); return }

    setUploading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not authenticated'); setUploading(false); return }

    const { data: profile } = await supabase.from('profiles').select('firm_id').single()
    if (!profile) { setError('Profile not found'); setUploading(false); return }

    const storagePath = `${profile.firm_id}/${existingDealId}/${Date.now()}_${file.name}`
    const { error: storageError } = await supabase.storage
      .from('deal-files')
      .upload(storagePath, file)

    if (storageError) { setError(storageError.message); setUploading(false); return }

    startTransition(async () => {
      try {
        const result = await createDealFromUpload({
          mode:           'existing',
          dealName:       '',
          existingDealId,
          storagePath,
          filename:       file.name,
          mimeType:       file.type || 'application/pdf',
          sizeBytes:      file.size,
          stageId:        stages[0]?.id ?? '',
        })

        if (result.error) {
          setError(result.error)
        } else if (result.deal) {
          onCreated(result.deal as Deal)
          return
        }
      } catch {
        setError('Something went wrong. Please try again.')
      }
      setUploading(false)
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Upload Offering Memorandum</h2>
        <p className="text-sm text-gray-500 mb-5">Upload a PDF to create a new deal or attach to an existing one.</p>

        {/* Mode toggle — hidden while analyzing or in preview */}
        {step === 'select' && (
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => handleModeChange('new')}
              className={`flex-1 text-sm py-2 rounded-md border transition-colors
                ${mode === 'new' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
            >
              Create New Deal
            </button>
            <button
              onClick={() => handleModeChange('existing')}
              className={`flex-1 text-sm py-2 rounded-md border transition-colors
                ${mode === 'existing' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
            >
              Attach to Existing
            </button>
          </div>
        )}

        {/* ── Analyzing ── */}
        {step === 'analyzing' && (
          <div className="py-12 text-center">
            <div className="inline-flex items-center gap-3 text-gray-700">
              <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm font-medium">Analyzing your OM…</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">Extracting property details with AI</p>
          </div>
        )}

        {/* ── Select / manual fallback ── */}
        {step === 'select' && (
          <>
            <div
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer mb-4 transition-colors
                ${file ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
            >
              {file ? (
                <>
                  <p className="text-sm font-medium text-blue-700">{file.name}</p>
                  <p className="text-xs text-gray-400 mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-500">Click to select a PDF</p>
                  <p className="text-xs text-gray-400 mt-1">or drag and drop</p>
                </>
              )}
              <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />
            </div>

            {parseError && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4">
                <p className="text-sm text-amber-700">{parseError}</p>
                {file && (
                  <button
                    onClick={() => analyzeFile(file)}
                    className="mt-2 text-xs font-medium text-amber-800 underline underline-offset-2 hover:text-amber-900"
                  >
                    Retry AI analysis
                  </button>
                )}
              </div>
            )}

            {mode === 'new' ? (
              parseError ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Deal Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="input-base"
                      placeholder="123 Main St, Austin TX"
                      autoFocus
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Market</label>
                      <input value={market} onChange={e => setMarket(e.target.value)} className="input-base" placeholder="Austin, TX" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Deal Type</label>
                      <input value={dealType} onChange={e => setDealType(e.target.value)} className="input-base" placeholder="Multifamily" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Source Name</label>
                    <input value={sourceName} onChange={e => setSourceName(e.target.value)} className="input-base" placeholder="CBRE / John Smith" />
                  </div>
                </div>
              ) : !file ? (
                <p className="text-xs text-gray-400 text-center py-1">
                  Select a PDF to auto-extract deal details with AI
                </p>
              ) : null
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Deal</label>
                <select value={existingDealId} onChange={e => setExistingDealId(e.target.value)} className="input-base">
                  <option value="">Choose a deal…</option>
                  {existingDeals.map(d => (
                    <option key={d.id} value={d.id}>{d.title}</option>
                  ))}
                </select>
              </div>
            )}

            {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

            <div className="flex gap-3 justify-end mt-5">
              <button onClick={onCancel} className="btn-ghost">Cancel</button>
              {mode === 'new' && parseError && (
                <button
                  onClick={handleConfirm}
                  disabled={isLoading || !file || !title.trim()}
                  className="btn-primary disabled:opacity-50"
                >
                  {isLoading ? 'Creating…' : 'Create Deal'}
                </button>
              )}
              {mode === 'existing' && (
                <button
                  onClick={handleExistingSubmit}
                  disabled={isLoading || !file || !existingDealId}
                  className="btn-primary disabled:opacity-50"
                >
                  {isLoading ? 'Uploading…' : 'Upload & Attach'}
                </button>
              )}
            </div>
          </>
        )}

        {/* ── Preview ── */}
        {step === 'preview' && (
          <>
            <div className="mb-4 flex items-center gap-2">
              <button
                onClick={() => setStep('select')}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                ← Back
              </button>
              <span className="text-xs text-gray-400">Review and edit extracted data</span>
            </div>

            <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deal Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="input-base"
                  placeholder="123 Main St, Austin TX"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Market</label>
                  <input value={market} onChange={e => setMarket(e.target.value)} className="input-base" placeholder="Austin, TX" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deal Type</label>
                  <input value={dealType} onChange={e => setDealType(e.target.value)} className="input-base" placeholder="Multifamily" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Broker / Source</label>
                <input
                  value={sourceName}
                  onChange={e => setSourceName(e.target.value)}
                  className="input-base"
                  placeholder="John Smith"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Asking Price</label>
                  <input
                    value={askingPrice}
                    onChange={e => setAskingPrice(e.target.value)}
                    className="input-base"
                    placeholder="5,000,000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NOI</label>
                  <input
                    value={noi}
                    onChange={e => setNoi(e.target.value)}
                    className="input-base"
                    placeholder="300,000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cap Rate %</label>
                  <input
                    value={capRate}
                    onChange={e => setCapRate(e.target.value)}
                    className="input-base"
                    placeholder="6.00"
                  />
                </div>
              </div>

              {/* Additional details (read-only) */}
              {parsedOM && (parsedOM.square_footage || parsedOM.year_built || parsedOM.num_units || parsedOM.occupancy_rate) && (
                <div className="bg-gray-50 rounded-md p-3">
                  <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Additional Details</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {parsedOM.square_footage && (
                      <p className="text-xs text-gray-600">SF: {parsedOM.square_footage.toLocaleString()}</p>
                    )}
                    {parsedOM.year_built && (
                      <p className="text-xs text-gray-600">Year Built: {parsedOM.year_built}</p>
                    )}
                    {parsedOM.num_units && (
                      <p className="text-xs text-gray-600">Units: {parsedOM.num_units}</p>
                    )}
                    {parsedOM.occupancy_rate && (
                      <p className="text-xs text-gray-600">Occupancy: {(parsedOM.occupancy_rate * 100).toFixed(1)}%</p>
                    )}
                  </div>
                </div>
              )}

              {/* Broker contact prompt */}
              {parsedOM?.broker_name && (
                <div className="border border-blue-200 bg-blue-50 rounded-md p-3">
                  <p className="text-sm text-blue-800">
                    We found broker <strong>{parsedOM.broker_name}</strong>
                    {parsedOM.brokerage ? ` from ${parsedOM.brokerage}` : ''} — add them to your contacts?
                  </p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setAddBroker(true)}
                      className={`text-xs px-3 py-1 rounded border transition-colors
                        ${addBroker
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setAddBroker(false)}
                      className={`text-xs px-3 py-1 rounded border transition-colors
                        ${!addBroker
                          ? 'bg-gray-200 text-gray-700 border-gray-300'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                    >
                      No
                    </button>
                  </div>
                </div>
              )}
            </div>

            {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

            <div className="flex gap-3 justify-end mt-5">
              <button onClick={onCancel} className="btn-ghost">Cancel</button>
              <button
                onClick={handleConfirm}
                disabled={isLoading || !title.trim()}
                className="btn-primary disabled:opacity-50"
              >
                {isLoading ? 'Creating deal…' : 'Confirm & Create Deal'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
