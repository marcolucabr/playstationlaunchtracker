export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      authorized_sellers: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          product_id: string
          retailer_id: string
          seller_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          product_id: string
          retailer_id: string
          seller_name: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string
          retailer_id?: string
          seller_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "authorized_sellers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "authorized_sellers_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_runs: {
        Row: {
          errors: Json | null
          finished_at: string | null
          id: string
          mentions_inserted: number
          product_id: string | null
          retailers_checked: number
          snapshots_inserted: number
          started_at: string
          status: Database["public"]["Enums"]["run_status"]
          trigger: Database["public"]["Enums"]["run_trigger"]
        }
        Insert: {
          errors?: Json | null
          finished_at?: string | null
          id?: string
          mentions_inserted?: number
          product_id?: string | null
          retailers_checked?: number
          snapshots_inserted?: number
          started_at?: string
          status?: Database["public"]["Enums"]["run_status"]
          trigger?: Database["public"]["Enums"]["run_trigger"]
        }
        Update: {
          errors?: Json | null
          finished_at?: string | null
          id?: string
          mentions_inserted?: number
          product_id?: string | null
          retailers_checked?: number
          snapshots_inserted?: number
          started_at?: string
          status?: Database["public"]["Enums"]["run_status"]
          trigger?: Database["public"]["Enums"]["run_trigger"]
        }
        Relationships: [
          {
            foreignKeyName: "collection_runs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      login_sessions: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          device: string | null
          id: string
          ip_address: string | null
          last_seen_at: string
          login_at: string
          logout_at: string | null
          os: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          device?: string | null
          id?: string
          ip_address?: string | null
          last_seen_at?: string
          login_at?: string
          logout_at?: string | null
          os?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          device?: string | null
          id?: string
          ip_address?: string | null
          last_seen_at?: string
          login_at?: string
          logout_at?: string | null
          os?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mentions: {
        Row: {
          author: string | null
          captured_at: string
          engagement: number | null
          excerpt: string | null
          id: string
          posted_at: string | null
          product_id: string
          sentiment: Database["public"]["Enums"]["sentiment"] | null
          source: Database["public"]["Enums"]["mention_source"]
          source_name: string | null
          title: string | null
          url: string | null
        }
        Insert: {
          author?: string | null
          captured_at?: string
          engagement?: number | null
          excerpt?: string | null
          id?: string
          posted_at?: string | null
          product_id: string
          sentiment?: Database["public"]["Enums"]["sentiment"] | null
          source: Database["public"]["Enums"]["mention_source"]
          source_name?: string | null
          title?: string | null
          url?: string | null
        }
        Update: {
          author?: string | null
          captured_at?: string
          engagement?: number | null
          excerpt?: string | null
          id?: string
          posted_at?: string | null
          product_id?: string
          sentiment?: Database["public"]["Enums"]["sentiment"] | null
          source?: Database["public"]["Enums"]["mention_source"]
          source_name?: string | null
          title?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      price_snapshots: {
        Row: {
          captured_at: string
          id: string
          in_stock: boolean | null
          installment_count: number | null
          installment_total_cents: number | null
          installment_value_cents: number | null
          is_first_party: boolean
          is_presale: boolean
          price_avista_cents: number | null
          price_full_cents: number | null
          product_id: string
          product_url: string | null
          raw_payload: Json | null
          retailer_id: string
          seller_name: string | null
          status: Database["public"]["Enums"]["price_status"]
        }
        Insert: {
          captured_at?: string
          id?: string
          in_stock?: boolean | null
          installment_count?: number | null
          installment_total_cents?: number | null
          installment_value_cents?: number | null
          is_first_party: boolean
          is_presale?: boolean
          price_avista_cents?: number | null
          price_full_cents?: number | null
          product_id: string
          product_url?: string | null
          raw_payload?: Json | null
          retailer_id: string
          seller_name?: string | null
          status?: Database["public"]["Enums"]["price_status"]
        }
        Update: {
          captured_at?: string
          id?: string
          in_stock?: boolean | null
          installment_count?: number | null
          installment_total_cents?: number | null
          installment_value_cents?: number | null
          is_first_party?: boolean
          is_presale?: boolean
          price_avista_cents?: number | null
          price_full_cents?: number | null
          product_id?: string
          product_url?: string | null
          raw_payload?: Json | null
          retailer_id?: string
          seller_name?: string | null
          status?: Database["public"]["Enums"]["price_status"]
        }
        Relationships: [
          {
            foreignKeyName: "price_snapshots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_snapshots_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_aliases: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["alias_kind"]
          product_id: string
          scope: string | null
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["alias_kind"]
          product_id: string
          scope?: string | null
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["alias_kind"]
          product_id?: string
          scope?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_aliases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_retailer_urls: {
        Row: {
          active: boolean
          created_at: string
          id: string
          last_checked_at: string | null
          last_status: string | null
          product_id: string
          retailer_id: string
          updated_at: string
          url: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          last_checked_at?: string | null
          last_status?: string | null
          product_id: string
          retailer_id: string
          updated_at?: string
          url: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          last_checked_at?: string | null
          last_status?: string | null
          product_id?: string
          retailer_id?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean
          created_at: string
          ean: string | null
          id: string
          max_discount_avista_pct: number
          name: string
          notes: string | null
          platform: string | null
          presale_allowed: boolean
          presale_starts_at: string | null
          release_date: string | null
          srp_cents: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          ean?: string | null
          id?: string
          max_discount_avista_pct?: number
          name: string
          notes?: string | null
          platform?: string | null
          presale_allowed?: boolean
          presale_starts_at?: string | null
          release_date?: string | null
          srp_cents: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          ean?: string | null
          id?: string
          max_discount_avista_pct?: number
          name?: string
          notes?: string | null
          platform?: string | null
          presale_allowed?: boolean
          presale_starts_at?: string | null
          release_date?: string | null
          srp_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      retailers: {
        Row: {
          active: boolean
          created_at: string
          display_order: number
          id: string
          kind: Database["public"]["Enums"]["retailer_kind"]
          name: string
          slug: string
          website: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_order?: number
          id?: string
          kind: Database["public"]["Enums"]["retailer_kind"]
          name: string
          slug: string
          website?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          display_order?: number
          id?: string
          kind?: Database["public"]["Enums"]["retailer_kind"]
          name?: string
          slug?: string
          website?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      alias_kind:
        | "ean"
        | "asin"
        | "keyword"
        | "hashtag"
        | "url"
        | "concept_id"
        | "other"
      app_role: "admin" | "viewer"
      mention_source:
        | "twitter"
        | "reddit"
        | "youtube"
        | "tiktok"
        | "instagram"
        | "forum"
        | "blog"
        | "other"
      price_status:
        | "ok"
        | "abaixo_piso"
        | "acima_srp"
        | "vendedor_nao_autorizado"
        | "pre_venda_nao_permitida"
        | "sem_desconto"
        | "blocked"
        | "not_found"
        | "error"
      retailer_kind: "1p" | "3p" | "both"
      run_status: "running" | "success" | "partial" | "failed"
      run_trigger: "manual" | "cron"
      sentiment: "positive" | "neutral" | "negative"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      alias_kind: [
        "ean",
        "asin",
        "keyword",
        "hashtag",
        "url",
        "concept_id",
        "other",
      ],
      app_role: ["admin", "viewer"],
      mention_source: [
        "twitter",
        "reddit",
        "youtube",
        "tiktok",
        "instagram",
        "forum",
        "blog",
        "other",
      ],
      price_status: [
        "ok",
        "abaixo_piso",
        "acima_srp",
        "vendedor_nao_autorizado",
        "pre_venda_nao_permitida",
        "sem_desconto",
        "blocked",
        "not_found",
        "error",
      ],
      retailer_kind: ["1p", "3p", "both"],
      run_status: ["running", "success", "partial", "failed"],
      run_trigger: ["manual", "cron"],
      sentiment: ["positive", "neutral", "negative"],
    },
  },
} as const
