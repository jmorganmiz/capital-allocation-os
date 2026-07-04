'use client'

import { useEffect, useState, useRef, useTransition } from 'react'
import { Deal, DealStage } from '@/lib/types/database'
import { createClient } from '@/lib/supabase/client'
import { createDealFromUpload, createDealFromOM } from '@/lib/actions/deals'
import { showToast } from '@/lib/toast'

interface ParsedOM {
  address: string | null
  asking_price: number | null
  noi: number | null
  cap_rate: number | null
  irr: number | null
  debt_service: number | null
  property_type: string | null
  square_footage: number | null
  year_built: number | null
  num_units: number | null
  occupancy_rate: number | null
  current_rent: number | null
  market_rent: number | null
  vacancy_rate: number | null
  property_taxes: number | null
  insurance: number | null
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
  const [currentRent, setCurrentRent] = useState('')
  const [marketRent, setMarketRent] = useState('')
  const [vacancyRate, setVacancyRate] = useState('')
  const [propertyTaxes, setPropertyTaxes] = useState('')
  const [insurance, setInsurance] = useState('')
  const [addBroker, setAddBroker] = useState(false)

  // Storage path set by analyzeFile so handleConfirm can reuse it (avoid double-upload)
  const [tempStoragePath, setTempStoragePath] = useState<string | null>(null)

  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  const isLoading = uploading || isPending
  const extractedFieldCount = [title, market, dealType, sourceName, askingPrice, noi, capRate, currentRent, marketRent, vacancyRate, propertyTaxes, insurance].filter(Boolean).length

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isLoading) onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isLoading, onCancel])

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
    setCurrentRent(data.current_rent ? formatCurrency(data.current_rent) : '')
    setMarketRent(data.market_rent ? formatCurrency(data.market_rent) : '')
    setVacancyRate(data.vacancy_rate !== null ? (data.vacancy_rate * 100).toFixed(2) : '')
    setPropertyTaxes(data.property_taxes ? formatCurrency(data.property_taxes) : '')
    setInsurance(data.insurance ? formatCurrency(data.insurance) : '')
    setAddBroker(false)
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
            irr:          parsedOM?.irr ?? null,
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
          underwritingInputs: {
            current_rent: parseCurrency(currentRent),
            market_rent: parseCurrency(marketRent),
            vacancy_rate: vacancyRate ? parseFloat(vacancyRate) / 100 : null,
            property_taxes: parseCurrency(propertyTaxes),
            insurance: parseCurrency(insurance),
          },
        })

        console.log('[OM] createDealFromOM result:', result)
        if (result.error) {
          setError(result.error)
        } else if (result.deal) {
          console.log('[OM] Deal created successfully:', result.deal.id)
          const sr = result.scoreResult
          if (sr?.error) showToast(`AI scoring failed: ${sr.error}`, 'error')
          else if (sr?.skippedReason) showToast(`AI scoring skipped: ${sr.skippedReason}`, 'info')
          else if (sr?.scoresWritten) showToast(`AI scored ${sr.scoresWritten} criteria`, 'success')
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
    <div
      className="om-upload-backdrop"
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget && !isLoading) onCancel()
      }}
    >
      <section className="app-modal om-upload-modal" role="dialog" aria-modal="true" aria-labelledby="om-upload-title">
        <header className="om-upload-header">
          <div>
            <p className="om-upload-eyebrow">Deal intake</p>
            <h2 id="om-upload-title">Upload an offering memorandum</h2>
            <p>Dealstash reads the PDF, prepares the deal record, and keeps the source document attached.</p>
          </div>
          <button type="button" className="om-upload-close" onClick={onCancel} disabled={isLoading} aria-label="Close upload dialog">
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <div className="om-upload-body">

        {/* Mode toggle — hidden while analyzing or in preview */}
        {step === 'select' && (
          <div className="om-upload-mode" aria-label="Upload destination">
            <button
              type="button"
              onClick={() => handleModeChange('new')}
              className={mode === 'new' ? 'is-active' : ''}
            >
              <span>Create new deal</span>
              <small>Start a fresh record</small>
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('existing')}
              className={mode === 'existing' ? 'is-active' : ''}
            >
              <span>Attach to existing</span>
              <small>Add the OM to a deal</small>
            </button>
          </div>
        )}

        {/* ── Analyzing ── */}
        {step === 'analyzing' && (
          <div className="om-upload-analyzing">
            <div className="om-upload-analyzing-icon">
              <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <h3>Reading your OM…</h3>
            <p>Extracting deal facts and preparing a reviewable record.</p>
          </div>
        )}

        {/* ── Select / manual fallback ── */}
        {step === 'select' && (
          <>
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={event => event.preventDefault()}
              onDrop={event => {
                event.preventDefault()
                const droppedFile = event.dataTransfer.files[0]
                if (!droppedFile) return
                setFile(droppedFile)
                if (mode === 'new') analyzeFile(droppedFile)
              }}
              className={`om-upload-dropzone ${file ? 'has-file' : ''}`}
            >
              {file ? (
                <>
                  <span className="om-upload-file-icon" aria-hidden="true">PDF</span>
                  <div>
                    <strong>{file.name}</strong>
                    <p>{(file.size / 1024 / 1024).toFixed(1)} MB · Ready to analyze</p>
                  </div>
                  <span className="om-upload-change">Change file</span>
                </>
              ) : (
                <>
                  <span className="om-upload-document-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8m-6-6 6 6m-6-6v6h6M12 18v-6m-3 3 3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                  <strong>Choose a PDF or drag it here</strong>
                  <p>Offering memorandums up to 20 MB</p>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            <div className="om-upload-footer">
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
            <div className="om-review-toolbar">
              <button
                type="button"
                onClick={() => setStep('select')}
                className="om-review-back"
              >
                ← Back
              </button>
              <div className="om-review-status">
                <span aria-hidden="true">✓</span>
                <div>
                  <strong>Extraction complete</strong>
                  <small>{extractedFieldCount} core fields found</small>
                </div>
              </div>
            </div>

            <div className="om-review-content">
              <section className="om-review-section">
                <div className="om-review-section-heading">
                  <div>
                    <p className="om-upload-eyebrow">Deal profile</p>
                    <h3>Core deal facts</h3>
                  </div>
                  <p>Confirm the facts Dealstash will use to create the record.</p>
                </div>
                <div className="om-review-fields">
                  <div className="om-review-field om-review-field-wide">
                <label>
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

                  <div className="om-review-field">
                  <label>Market</label>
                  <input value={market} onChange={e => setMarket(e.target.value)} className="input-base" placeholder="Austin, TX" />
                  </div>
                  <div className="om-review-field">
                  <label>Deal Type</label>
                  <input value={dealType} onChange={e => setDealType(e.target.value)} className="input-base" placeholder="Multifamily" />
                  </div>

                  <div className="om-review-field om-review-field-wide">
                <label>Broker / Source</label>
                <input
                  value={sourceName}
                  onChange={e => setSourceName(e.target.value)}
                  className="input-base"
                  placeholder="John Smith"
                />
                  </div>
                </div>
              </section>

              <section className="om-review-section">
                <div className="om-review-section-heading">
                  <div>
                    <p className="om-upload-eyebrow">Financial snapshot</p>
                    <h3>Initial underwriting facts</h3>
                  </div>
                  <p>Missing values can be completed later inside the deal.</p>
                </div>
                <div className="om-review-financials">
                  <div className="om-review-field om-review-money">
                  <label>Asking Price</label>
                  <span>$</span>
                  <input
                    value={askingPrice}
                    onChange={e => setAskingPrice(e.target.value)}
                    className="input-base"
                    placeholder="5,000,000"
                  />
                  </div>
                  <div className="om-review-field om-review-money">
                  <label>NOI</label>
                  <span>$</span>
                  <input
                    value={noi}
                    onChange={e => setNoi(e.target.value)}
                    className="input-base"
                    placeholder="300,000"
                  />
                  </div>
                  <div className="om-review-field om-review-percent">
                  <label>Cap Rate</label>
                  <input
                    value={capRate}
                    onChange={e => setCapRate(e.target.value)}
                    className="input-base"
                    placeholder="6.00"
                  />
                  <span>%</span>
                  </div>
                </div>
              </section>

              <section className="om-review-section">
                <div className="om-review-section-heading">
                  <div>
                    <p className="om-upload-eyebrow">Quick Pencil</p>
                    <h3>Operating assumptions</h3>
                  </div>
                  <p>These values seed the first underwriting model. Review them before creating the deal.</p>
                </div>
                <div className="om-review-operations">
                  <div className="om-review-field om-review-money">
                    <label>Current rent / unit</label><span>$</span>
                    <input value={currentRent} onChange={e => setCurrentRent(e.target.value)} className="input-base" placeholder="1,388" />
                  </div>
                  <div className="om-review-field om-review-money">
                    <label>Market rent / unit</label><span>$</span>
                    <input value={marketRent} onChange={e => setMarketRent(e.target.value)} className="input-base" placeholder="1,650" />
                  </div>
                  <div className="om-review-field om-review-percent">
                    <label>Vacancy</label>
                    <input value={vacancyRate} onChange={e => setVacancyRate(e.target.value)} className="input-base" placeholder="5.00" /><span>%</span>
                  </div>
                  <div className="om-review-field om-review-money">
                    <label>Annual property taxes</label><span>$</span>
                    <input value={propertyTaxes} onChange={e => setPropertyTaxes(e.target.value)} className="input-base" placeholder="14,096" />
                  </div>
                  <div className="om-review-field om-review-money">
                    <label>Annual insurance</label><span>$</span>
                    <input value={insurance} onChange={e => setInsurance(e.target.value)} className="input-base" placeholder="5,821" />
                  </div>
                </div>
              </section>

              {/* Additional details (read-only) */}
              {parsedOM && (parsedOM.square_footage || parsedOM.year_built || parsedOM.num_units || parsedOM.occupancy_rate || parsedOM.irr || parsedOM.debt_service) && (
                <section className="om-review-section">
                  <div className="om-review-section-heading">
                    <div>
                      <p className="om-upload-eyebrow">From the document</p>
                      <h3>Additional details</h3>
                    </div>
                    <p>These facts will be retained with the source OM.</p>
                  </div>
                  <div className="om-review-details">
                    {parsedOM.square_footage && (
                      <div><span>Square feet</span><strong>{parsedOM.square_footage.toLocaleString()}</strong></div>
                    )}
                    {parsedOM.year_built && (
                      <div><span>Year built</span><strong>{parsedOM.year_built}</strong></div>
                    )}
                    {parsedOM.num_units && (
                      <div><span>Units</span><strong>{parsedOM.num_units}</strong></div>
                    )}
                    {parsedOM.occupancy_rate && (
                      <div><span>Occupancy</span><strong>{(parsedOM.occupancy_rate * 100).toFixed(1)}%</strong></div>
                    )}
                    {parsedOM.irr && (
                      <div><span>Projected IRR</span><strong>{(parsedOM.irr * 100).toFixed(1)}%</strong></div>
                    )}
                    {parsedOM.debt_service && (
                      <div><span>Debt service</span><strong>${parsedOM.debt_service.toLocaleString()}/yr</strong></div>
                    )}
                  </div>
                </section>
              )}

              {/* Broker contact prompt */}
              {parsedOM?.broker_name && (
                <section className="om-review-broker">
                  <div>
                    <p className="om-upload-eyebrow">Relationship memory</p>
                    <strong>{parsedOM.broker_name}</strong>
                    <span>{parsedOM.brokerage ? parsedOM.brokerage : 'Broker found in this OM'}</span>
                  </div>
                  <div className="om-review-choice" aria-label="Add broker to contacts">
                    <button
                      type="button"
                      onClick={() => setAddBroker(true)}
                      className={addBroker ? 'is-active' : ''}
                    >
                      Add contact
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddBroker(false)}
                      className={!addBroker ? 'is-active' : ''}
                    >
                      Not now
                    </button>
                  </div>
                </section>
              )}
            </div>

            {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

            <div className="om-upload-footer">
              <button onClick={onCancel} className="btn-ghost">Cancel</button>
              <button
                onClick={handleConfirm}
                disabled={isLoading || !title.trim()}
                className="btn-primary disabled:opacity-50"
              >
                {isLoading ? 'Creating deal…' : 'Create deal & open record'}
              </button>
            </div>
          </>
        )}
        </div>
      </section>
    </div>
  )
}
