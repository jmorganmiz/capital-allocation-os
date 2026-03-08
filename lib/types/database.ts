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
          created_by: string; created_at: string; updated_at: string
        }
        Insert: {
          id?: string; firm_id: string; title: string; market?: string | null
          deal_type?: string | null; source_type?: string | null; source_name?: string | null
          stage_id?: string | null; is_archived?: boolean; owner_user_id?: string | null
          intake_type?: string | null; created_by: string
        }
        Update: {
          title?: string; market?: string | null; deal_type?: string | null
          source_type?: string | null; source_name?: string | null; stage_id?: string | null
          is_archived?: boolean; archived_at?: string | null; owner_user_id?: string | null
          intake_type?: string | null; updated_at?: string
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
      deal_financial_snapshots: {
        Row: {
          id: string; deal_id: string; firm_id: string; version: number
          purchase_price: number | null; noi: number | null; cap_rate: number | null
          debt_rate: number | null; ltv: number | null; irr: number | null
          created_by: string; created_at: string
        }
        Insert: {
          id?: string; deal_id: string; firm_id: string; version?: number
          purchase_price?: number | null; noi?: number | null; cap_rate?: number | null
          debt_rate?: number | null; ltv?: number | null; irr?: number | null
          created_by: string
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
