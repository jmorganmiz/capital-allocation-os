export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      firms: {
        Row: { id: string; name: string; created_at: string }
        Insert: { id?: string; name: string; created_at?: string }
        Update: { name?: string }
      }
      profiles: {
        Row: { id: string; firm_id: string; full_name: string | null; role: string | null; created_at: string }
        Insert: { id: string; firm_id: string; full_name?: string | null; role?: string | null }
        Update: { full_name?: string | null; role?: string | null }
      }
      deal_stages: {
        Row: { id: string; firm_id: string; name: string; position: number; is_terminal: boolean; created_at: string }
        Insert: { id?: string; firm_id: string; name: string; position?: number; is_terminal?: boolean }
        Update: { name?: string; position?: number; is_terminal?: boolean }
      }
      deals: {
        Row: {
          id: string; firm_id: string; title: string; market: string | null
          deal_type: string | null; source_type: string | null; source_name: string | null
          stage_id: string | null; is_archived: boolean; archived_at: string | null
          owner_user_id: string | null; intake_type: string | null
          deal_structure: string | null; financing_type: string | null
          asking_price: number | null; property_size: string | null
          address: string | null
          created_by: string; created_at: string; updated_at: string
        }
        Insert: {
          id?: string; firm_id: string; title: string; market?: string | null
          deal_type?: string | null; source_type?: string | null; source_name?: string | null
          stage_id?: string | null; is_archived?: boolean; owner_user_id?: string | null
          intake_type?: string | null; deal_structure?: string | null
          financing_type?: string | null; asking_price?: number | null
          property_size?: string | null; address?: string | null; created_by: string
        }
        Update: {
          title?: string; market?: string | null; deal_type?: string | null
          source_type?: string | null; source_name?: string | null; stage_id?: string | null
          is_archived?: boolean; archived_at?: string | null; owner_user_id?: string | null
          intake_type?: string | null; deal_structure?: string | null
          financing_type?: string | null; asking_price?: number | null
          property_size?: string | null; address?: string | null; updated_at?: string
        }
      }
      kill_reasons: {
        Row: { id: string; firm_id: string; name: string; position: number; created_at: string }
        Insert: { id?: string; firm_id: string; name: string; position?: number }
        Update: { name?: string; position?: number }
      }
      deal_events: {
        Row: {
          id: string; firm_id: string; deal_id: string; event_type: string
          from_stage_id: string | null; to_stage_id: string | null
          kill_reason_id: string | null; notes: string | null
          actor_user_id: string; created_at: string
        }
        Insert: {
          id?: string; firm_id: string; deal_id: string; event_type: string
          from_stage_id?: string | null; to_stage_id?: string | null
          kill_reason_id?: string | null; notes?: string | null; actor_user_id: string
        }
        Update: never
      }
      deal_notes: {
        Row: {
          id: string; deal_id: string; firm_id: string; section: string
          content: string; created_by: string; updated_by: string | null
          created_at: string; updated_at: string
        }
        Insert: { id?: string; deal_id: string; firm_id: string; section: string; content?: string; created_by: string }
        Update: { content?: string; updated_by?: string }
      }
      deal_files: {
        Row: {
          id: string; deal_id: string; firm_id: string; storage_bucket: string
          storage_path: string; filename: string; mime_type: string | null
          size_bytes: number | null; uploaded_by: string; created_at: string
        }
        Insert: {
          id?: string; deal_id: string; firm_id: string; storage_bucket?: string
          storage_path: string; filename: string; mime_type?: string | null
          size_bytes?: number | null; uploaded_by: string
        }
        Update: never
      }
      scoring_criteria: {
        Row: {
          id: string; firm_id: string; name: string; description: string | null
          position: number; is_active: boolean; created_at: string
        }
        Insert: {
          id?: string; firm_id: string; name: string; description?: string | null
          position?: number; is_active?: boolean
        }
        Update: { name?: string; description?: string | null; position?: number; is_active?: boolean }
      }
      deal_scores: {
        Row: {
          id: string; deal_id: string; criteria_id: string; firm_id: string | null
          score: number; notes: string | null; scored_by: string | null; updated_at: string
        }
        Insert: {
          id?: string; deal_id: string; criteria_id: string; firm_id?: string | null
          score: number; notes?: string | null; scored_by?: string | null
        }
        Update: { score?: number; notes?: string | null; scored_by?: string | null; updated_at?: string }
      }
      contacts: {
        Row: {
          id: string; firm_id: string; name: string; email: string | null
          phone: string | null; company: string | null
          contact_type: 'broker' | 'seller' | 'lender' | null
          notes: string | null; created_by: string; created_at: string
        }
        Insert: {
          id?: string; firm_id: string; name: string; email?: string | null
          phone?: string | null; company?: string | null
          contact_type?: 'broker' | 'seller' | 'lender' | null
          notes?: string | null; created_by: string
        }
        Update: {
          name?: string; email?: string | null; phone?: string | null
          company?: string | null; contact_type?: 'broker' | 'seller' | 'lender' | null
          notes?: string | null
        }
      }
      deal_contacts: {
        Row: {
          id: string; deal_id: string; contact_id: string
          firm_id: string | null; is_source: boolean; created_at: string
        }
        Insert: {
          id?: string; deal_id: string; contact_id: string
          firm_id?: string | null; is_source?: boolean
        }
        Update: { is_source?: boolean }
      }
      stage_checklist_items: {
        Row: {
          id: string; firm_id: string; stage_id: string
          name: string; position: number; created_at: string
        }
        Insert: {
          id?: string; firm_id: string; stage_id: string
          name: string; position?: number
        }
        Update: { name?: string; position?: number }
      }
      buy_boxes: {
        Row: {
          id: string; firm_id: string; name: string; asset_type: string
          min_cap_rate: number | null; max_asking_price: number | null; min_noi: number | null
          preferred_markets: string | null; preferred_deal_structure: string | null
          notes: string | null; updated_at: string
        }
        Insert: {
          id?: string; firm_id: string; name: string; asset_type: string
          min_cap_rate?: number | null; max_asking_price?: number | null; min_noi?: number | null
          preferred_markets?: string | null; preferred_deal_structure?: string | null; notes?: string | null
        }
        Update: {
          name?: string; asset_type?: string
          min_cap_rate?: number | null; max_asking_price?: number | null; min_noi?: number | null
          preferred_markets?: string | null; preferred_deal_structure?: string | null
          notes?: string | null; updated_at?: string
        }
      }
      buy_box_criteria: {
        Row: {
          id: string; buy_box_id: string; firm_id: string; name: string
          description: string | null; position: number; created_at: string
        }
        Insert: {
          id?: string; buy_box_id: string; firm_id: string; name: string
          description?: string | null; position?: number
        }
        Update: { name?: string; description?: string | null; position?: number }
      }
      deal_checklist_progress: {
        Row: {
          id: string; deal_id: string; checklist_item_id: string
          firm_id: string; completed_by: string; completed_at: string
        }
        Insert: {
          id?: string; deal_id: string; checklist_item_id: string
          firm_id: string; completed_by: string
        }
        Update: never
      }
      deal_financial_snapshots: {
        Row: {
          id: string; deal_id: string; firm_id: string; version: number
          purchase_price: number | null; noi: number | null; cap_rate: number | null
          debt_rate: number | null; ltv: number | null; irr: number | null
          square_footage: number | null; year_built: number | null
          num_units: number | null; occupancy_rate: number | null
          notes: string | null
          created_by: string; created_at: string
        }
        Insert: {
          id?: string; deal_id: string; firm_id: string; version?: number
          purchase_price?: number | null; noi?: number | null; cap_rate?: number | null
          debt_rate?: number | null; ltv?: number | null; irr?: number | null
          square_footage?: number | null; year_built?: number | null
          num_units?: number | null; occupancy_rate?: number | null
          notes?: string | null
          created_by: string | null
        }
        Update: never
      }
      firm_memories: {
        Row: {
          id: string
          firm_id: string
          source_question: string | null
          source_answer: string | null
          content: string
          feedback_type: 'saved' | 'helpful' | 'not_helpful' | 'correction' | 'firm_rule'
          tags: string[]
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          firm_id: string
          source_question?: string | null
          source_answer?: string | null
          content: string
          feedback_type?: 'saved' | 'helpful' | 'not_helpful' | 'correction' | 'firm_rule'
          tags?: string[]
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          source_question?: string | null
          source_answer?: string | null
          content?: string
          feedback_type?: 'saved' | 'helpful' | 'not_helpful' | 'correction' | 'firm_rule'
          tags?: string[]
          updated_at?: string
        }
      }
      firm_entitlements: {
        Row: {
          firm_id: string
          plan_key: 'core' | 'underwriting_beta' | 'underwriting_pro' | 'scale'
          underwriting_enabled: boolean
          included_seats: number
          monthly_underwrite_allowance: number
          current_period_start: string | null
          current_period_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          firm_id: string
          plan_key?: 'core' | 'underwriting_beta' | 'underwriting_pro' | 'scale'
          underwriting_enabled?: boolean
          included_seats?: number
          monthly_underwrite_allowance?: number
          current_period_start?: string | null
          current_period_end?: string | null
        }
        Update: {
          plan_key?: 'core' | 'underwriting_beta' | 'underwriting_pro' | 'scale'
          underwriting_enabled?: boolean
          included_seats?: number
          monthly_underwrite_allowance?: number
          current_period_start?: string | null
          current_period_end?: string | null
        }
      }
      underwriting_runs: {
        Row: {
          id: string
          firm_id: string
          deal_id: string
          parent_run_id: string | null
          run_type: 'quick_pencil' | 'full_underwrite' | 'market_refresh' | 'ic_memo'
          scenario_key: 'base' | 'downside' | 'upside' | 'custom'
          status: 'queued' | 'running' | 'needs_review' | 'completed' | 'failed' | 'canceled'
          assumption_status: 'draft' | 'needs_review' | 'approved' | 'rejected'
          model_version: string
          projection_start_date: string
          input_snapshot: Json
          output_snapshot: Json | null
          warnings: Json
          error_code: string | null
          error_message: string | null
          credits_reserved: number
          credits_settled: number
          idempotency_key: string | null
          created_by: string
          approved_by: string | null
          approved_at: string | null
          started_at: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          firm_id: string
          deal_id: string
          parent_run_id?: string | null
          run_type: 'quick_pencil' | 'full_underwrite' | 'market_refresh' | 'ic_memo'
          scenario_key?: 'base' | 'downside' | 'upside' | 'custom'
          status?: 'queued' | 'running' | 'needs_review' | 'completed' | 'failed' | 'canceled'
          assumption_status?: 'draft' | 'needs_review' | 'approved' | 'rejected'
          model_version: string
          projection_start_date: string
          input_snapshot?: Json
          output_snapshot?: Json | null
          warnings?: Json
          error_code?: string | null
          error_message?: string | null
          credits_reserved?: number
          credits_settled?: number
          idempotency_key?: string | null
          created_by: string
          approved_by?: string | null
          approved_at?: string | null
          started_at?: string | null
          completed_at?: string | null
        }
        Update: {
          status?: 'queued' | 'running' | 'needs_review' | 'completed' | 'failed' | 'canceled'
          assumption_status?: 'draft' | 'needs_review' | 'approved' | 'rejected'
          output_snapshot?: Json | null
          warnings?: Json
          error_code?: string | null
          error_message?: string | null
          credits_reserved?: number
          credits_settled?: number
          approved_by?: string | null
          approved_at?: string | null
          started_at?: string | null
          completed_at?: string | null
        }
      }
      underwriting_assumptions: {
        Row: {
          id: string; firm_id: string; run_id: string; assumption_key: string; label: string
          category: string; value: Json; unit: string | null; source_type: string
          source_reference: string | null; source_excerpt: string | null
          source_effective_at: string | null; confidence: number | null
          approval_status: 'needs_review' | 'approved' | 'rejected'
          created_by: string; approved_by: string | null; approved_at: string | null
          created_at: string; updated_at: string
        }
        Insert: {
          id?: string; firm_id: string; run_id: string; assumption_key: string; label: string
          category: string; value: Json; unit?: string | null; source_type: string
          source_reference?: string | null; source_excerpt?: string | null
          source_effective_at?: string | null; confidence?: number | null
          approval_status?: 'needs_review' | 'approved' | 'rejected'
          created_by: string; approved_by?: string | null; approved_at?: string | null
        }
        Update: {
          value?: Json; approval_status?: 'needs_review' | 'approved' | 'rejected'
          approved_by?: string | null; approved_at?: string | null
        }
      }
      underwriting_approvals: {
        Row: {
          id: string; firm_id: string; run_id: string; assumption_id: string | null
          decision: 'approved' | 'rejected' | 'changes_requested'; notes: string | null
          decided_by: string; created_at: string
        }
        Insert: {
          id?: string; firm_id: string; run_id: string; assumption_id?: string | null
          decision: 'approved' | 'rejected' | 'changes_requested'; notes?: string | null
          decided_by: string
        }
        Update: never
      }
      usage_events: {
        Row: {
          id: string; firm_id: string; user_id: string; underwriting_run_id: string | null
          event_type: string; quantity: number; billable_credits: number
          provider: string | null; model: string | null; input_tokens: number | null
          output_tokens: number | null; search_requests: number | null
          estimated_cost_usd: number | null; idempotency_key: string
          metadata: Json; created_at: string
        }
        Insert: {
          id?: string; firm_id: string; user_id: string; underwriting_run_id?: string | null
          event_type: string; quantity?: number; billable_credits?: number
          provider?: string | null; model?: string | null; input_tokens?: number | null
          output_tokens?: number | null; search_requests?: number | null
          estimated_cost_usd?: number | null; idempotency_key: string
          metadata?: Json
        }
        Update: never
      }
      underwriting_steps: {
        Row: {
          id: string; firm_id: string; run_id: string; step_key: string; label: string
          position: number; status: 'queued' | 'running' | 'needs_review' | 'completed' | 'failed' | 'canceled'
          artifact_summary: string | null; artifact: Json | null; evidence_count: number
          confidence: number | null; attempts: number; error_code: string | null
          error_message: string | null; started_at: string | null; completed_at: string | null
          created_at: string; updated_at: string
        }
        Insert: {
          id?: string; firm_id: string; run_id: string; step_key: string; label: string
          position: number; status?: 'queued' | 'running' | 'needs_review' | 'completed' | 'failed' | 'canceled'
          artifact_summary?: string | null; artifact?: Json | null; evidence_count?: number
          confidence?: number | null; attempts?: number; error_code?: string | null
          error_message?: string | null; started_at?: string | null; completed_at?: string | null
        }
        Update: {
          status?: 'queued' | 'running' | 'needs_review' | 'completed' | 'failed' | 'canceled'
          artifact_summary?: string | null; artifact?: Json | null; evidence_count?: number
          confidence?: number | null; attempts?: number; error_code?: string | null
          error_message?: string | null; started_at?: string | null; completed_at?: string | null
        }
      }
      underwriting_sources: {
        Row: {
          id: string; firm_id: string; run_id: string; step_id: string | null
          deal_file_id: string | null; source_type: string; title: string
          source_url: string | null; locator: string | null; excerpt: string | null
          effective_at: string | null; confidence: number | null; created_at: string
        }
        Insert: {
          id?: string; firm_id: string; run_id: string; step_id?: string | null
          deal_file_id?: string | null; source_type: string; title: string
          source_url?: string | null; locator?: string | null; excerpt?: string | null
          effective_at?: string | null; confidence?: number | null
        }
        Update: never
      }
    }
    Functions: {
      current_firm_id: { Args: Record<string, never>; Returns: string }
    }
  }
}

export type Firm = Database['public']['Tables']['firms']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type DealStage = Database['public']['Tables']['deal_stages']['Row']
export type Deal = Database['public']['Tables']['deals']['Row']
export type KillReason = Database['public']['Tables']['kill_reasons']['Row']
export type DealEvent = Database['public']['Tables']['deal_events']['Row']
export type DealNote = Database['public']['Tables']['deal_notes']['Row']
export type DealFile = Database['public']['Tables']['deal_files']['Row']
export type DealFinancialSnapshot = Database['public']['Tables']['deal_financial_snapshots']['Row']
export type Contact = Database['public']['Tables']['contacts']['Row']
export type DealContact = Database['public']['Tables']['deal_contacts']['Row']
export type ScoringCriteria = Database['public']['Tables']['scoring_criteria']['Row']
export type DealScore = Database['public']['Tables']['deal_scores']['Row']
export type StageChecklistItem = Database['public']['Tables']['stage_checklist_items']['Row']
export type DealChecklistProgress = Database['public']['Tables']['deal_checklist_progress']['Row']
export type FirmMemory = Database['public']['Tables']['firm_memories']['Row']
export type FirmEntitlement = Database['public']['Tables']['firm_entitlements']['Row']
export type UnderwritingRun = Database['public']['Tables']['underwriting_runs']['Row']
export type UnderwritingAssumption = Database['public']['Tables']['underwriting_assumptions']['Row']
export type UnderwritingApproval = Database['public']['Tables']['underwriting_approvals']['Row']
export type UsageEvent = Database['public']['Tables']['usage_events']['Row']
export type UnderwritingStep = Database['public']['Tables']['underwriting_steps']['Row']
export type UnderwritingSource = Database['public']['Tables']['underwriting_sources']['Row']
