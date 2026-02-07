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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_interaction_settings: {
        Row: {
          additional_instructions: string | null
          agent_avatar_url: string | null
          agent_color: string
          agent_description: string | null
          closing_instructions: string | null
          communication_style: string
          conversation_focus: string
          created_at: string
          empathy_level: string
          expertise_level: string
          formality_level: string
          humor_level: string
          id: string
          main_objective: string
          name: string
          organization_id: string | null
          personality_traits: string[] | null
          priority: string
          proactivity_level: string
          rejection_action: string
          response_length: string
          tone: string
          updated_at: string
        }
        Insert: {
          additional_instructions?: string | null
          agent_avatar_url?: string | null
          agent_color?: string
          agent_description?: string | null
          closing_instructions?: string | null
          communication_style?: string
          conversation_focus: string
          empathy_level?: string
          expertise_level?: string
          formality_level?: string
          humor_level?: string
          id?: string
          main_objective: string
          name: string
          organization_id?: string | null
          personality_traits?: string[] | null
          priority?: string
          proactivity_level?: string
          rejection_action?: string
          response_length?: string
          tone?: string
          updated_at?: string
        }
        Update: {
          additional_instructions?: string | null
          agent_avatar_url?: string | null
          agent_color?: string
          agent_description?: string | null
          closing_instructions?: string | null
          communication_style?: string
          conversation_focus?: string
          empathy_level?: string
          expertise_level?: string
          formality_level?: string
          humor_level?: string
          id?: string
          main_objective?: string
          name?: string
          organization_id?: string | null
          personality_traits?: string[] | null
          priority?: string
          proactivity_level?: string
          rejection_action?: string
          response_length?: string
          tone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_interaction_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_context_documents: {
        Row: {
          id: string
          user_id: string
          file_name: string
          file_size: number
          file_type: string
          pinecone_index_name: string
          pinecone_vector_count: number
          status: string
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          file_name: string
          file_size: number
          file_type: string
          pinecone_index_name: string
          pinecone_vector_count?: number
          status?: string
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          file_name?: string
          file_size?: number
          file_type?: string
          pinecone_index_name?: string
          pinecone_vector_count?: number
          status?: string
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_context_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      company_documents: {
        Row: {
          created_at: string
          file_name: string
          google_drive_file_id: string
          google_drive_folder_id: string
          id: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          file_name: string
          google_drive_file_id: string
          google_drive_folder_id: string
          id?: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          file_name?: string
          google_drive_file_id?: string
          google_drive_folder_id?: string
          id?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_value_entries: {
        Row: {
          id: string
          lead_id: string
          value_type_id: string
          value: number
          created_at: string | null
        }
        Insert: {
          id?: string
          lead_id: string
          value_type_id: string
          value?: number
          created_at?: string | null
        }
        Update: {
          id?: string
          lead_id?: string
          value_type_id?: string
          value?: number
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_value_entries_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_value_entries_value_type_id_fkey"
            columns: ["value_type_id"]
            isOneToOne: false
            referencedRelation: "lead_value_types"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_value_types: {
        Row: {
          id: string
          organization_id: string
          name: string
          description: string | null
          key: string
          display_order: number
          created_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          description?: string | null
          key: string
          display_order?: number
          created_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          description?: string | null
          key?: string
          display_order?: number
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_value_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          ai_interaction_id: string | null
          annual_revenue: number | null
          category: string | null
          city: string | null
          company_name: string | null
          contact_email: string | null
          contact_whatsapp: string | null
          country: string | null
          created_at: string | null
          description: string | null
          id: string
          industry: string | null
          integration_start_time: string | null
          is_test: boolean | null
          job_title: string | null
          linkedin_url: string | null
          name: string
          notes: string | null
          number_of_employees: number | null
          organization_id: string | null
          paid_at: string | null
          payment_amount: number | null
          payment_link_url: string | null
          payment_status: string | null
          payment_stripe_id: string | null
          phone: string | null
          remote_jid: string | null
          source: string | null
          state: string | null
          status: string
          updated_at: string | null
          website: string | null
          whatsapp_verified: boolean | null
          zip_code: string | null
          address: string | null
          custom_values: Json | null
        }
        Insert: {
          ai_interaction_id?: string | null
          annual_revenue?: number | null
          category?: string | null
          city?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_whatsapp?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          integration_start_time?: string | null
          is_test?: boolean | null
          job_title?: string | null
          linkedin_url?: string | null
          name: string
          notes?: string | null
          number_of_employees?: number | null
          organization_id?: string | null
          paid_at?: string | null
          payment_amount?: number | null
          payment_link_url?: string | null
          payment_status?: string | null
          payment_stripe_id?: string | null
          phone?: string | null
          remote_jid?: string | null
          source?: string | null
          state?: string | null
          status?: string
          updated_at?: string | null
          website?: string | null
          whatsapp_verified?: boolean | null
          zip_code?: string | null
          address?: string | null
          custom_values?: Json | null
        }
        Update: {
          ai_interaction_id?: string | null
          annual_revenue?: number | null
          category?: string | null
          city?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_whatsapp?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          integration_start_time?: string | null
          is_test?: boolean | null
          job_title?: string | null
          linkedin_url?: string | null
          name?: string
          notes?: string | null
          number_of_employees?: number | null
          organization_id?: string | null
          paid_at?: string | null
          payment_amount?: number | null
          payment_link_url?: string | null
          payment_status?: string | null
          payment_stripe_id?: string | null
          phone?: string | null
          remote_jid?: string | null
          source?: string | null
          state?: string | null
          status?: string
          updated_at?: string | null
          website?: string | null
          whatsapp_verified?: boolean | null
          zip_code?: string | null
          address?: string | null
          custom_values?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_ai_interaction_id_fkey"
            columns: ["ai_interaction_id"]
            isOneToOne: false
            referencedRelation: "ai_interaction_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          cnpj: string | null
          company_name: string | null
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          plan: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_ends_at: string | null
          trial_ends_at: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          cnpj?: string | null
          company_name?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          plan?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_ends_at?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          cnpj?: string | null
          company_name?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          plan?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_ends_at?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          display_name: string | null
          id: string
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          id: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          id?: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_interactions: {
        Row: {
          id: string
          lead_id: string
          ai_interaction_id: string
          instance_name: string
          remote_jid: string
          scheduled_at: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lead_id: string
          ai_interaction_id: string
          instance_name: string
          remote_jid: string
          scheduled_at: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          lead_id?: string
          ai_interaction_id?: string
          instance_name?: string
          remote_jid?: string
          scheduled_at?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_interactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_interactions_ai_interaction_id_fkey"
            columns: ["ai_interaction_id"]
            isOneToOne: false
            referencedRelation: "ai_interaction_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_messages: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          lead_id: string
          instance_name: string
          message: string
          remote_jid: string
          scheduled_at: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          lead_id: string
          instance_name: string
          message: string
          remote_jid: string
          scheduled_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          lead_id?: string
          instance_name?: string
          message?: string
          remote_jid?: string
          scheduled_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string | null
          default_ai_interaction_id: string | null
          default_image_url: string | null
          default_integration_start_time: string | null
          default_message: string | null
          id: string
          n8n_webhook_url: string | null
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_ai_interaction_id?: string | null
          default_image_url?: string | null
          default_integration_start_time?: string | null
          default_message?: string | null
          id?: string
          n8n_webhook_url?: string | null
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_ai_interaction_id?: string | null
          default_image_url?: string | null
          default_integration_start_time?: string | null
          default_message?: string | null
          id?: string
          n8n_webhook_url?: string | null
          organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settings_default_ai_interaction_id_fkey"
            columns: ["default_ai_interaction_id"]
            isOneToOne: false
            referencedRelation: "ai_interaction_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_instances: {
        Row: {
          api_key: string | null
          connected_at: string | null
          created_at: string
          id: string
          instance_id: string | null
          instance_name: string
          organization_id: string | null
          phone_number: string | null
          qr_code: string | null
          status: string
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          api_key?: string | null
          connected_at?: string | null
          created_at?: string
          id?: string
          instance_id?: string | null
          instance_name: string
          organization_id?: string | null
          phone_number?: string | null
          qr_code?: string | null
          status?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          api_key?: string | null
          connected_at?: string | null
          created_at?: string
          id?: string
          instance_id?: string | null
          instance_name?: string
          organization_id?: string | null
          phone_number?: string | null
          qr_code?: string | null
          status?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_instances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_organization_id: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
