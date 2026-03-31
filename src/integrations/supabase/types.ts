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
      agent_component_configurations: {
        Row: {
          agent_id: string
          component_id: string
          config: Json
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          component_id: string
          config?: Json
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          component_id?: string
          config?: Json
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_component_configurations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_interaction_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_component_configurations_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "components"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_components: {
        Row: {
          agent_id: string
          component_id: string
          created_at: string
          id: string
        }
        Insert: {
          agent_id: string
          component_id: string
          created_at?: string
          id?: string
        }
        Update: {
          agent_id?: string
          component_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_components_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_interaction_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_components_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "components"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_scripts: {
        Row: {
          company_clients: string[] | null
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
          proactive_development_paper: string | null
          proactive_development_system: string | null
          proactive_hook_message: string | null
          proactive_opening_message: string | null
          receptive_deepening_question: string | null
          receptive_qualification_question: string | null
          receptive_value_proposition: string | null
          receptive_welcome_template: string | null
          scenario_detection_enabled: boolean | null
          total_clients: string | null
          updated_at: string
        }
        Insert: {
          company_clients?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          proactive_development_paper?: string | null
          proactive_development_system?: string | null
          proactive_hook_message?: string | null
          proactive_opening_message?: string | null
          receptive_deepening_question?: string | null
          receptive_qualification_question?: string | null
          receptive_value_proposition?: string | null
          receptive_welcome_template?: string | null
          scenario_detection_enabled?: boolean | null
          total_clients?: string | null
          updated_at?: string
        }
        Update: {
          company_clients?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          proactive_development_paper?: string | null
          proactive_development_system?: string | null
          proactive_hook_message?: string | null
          proactive_opening_message?: string | null
          receptive_deepening_question?: string | null
          receptive_qualification_question?: string | null
          receptive_value_proposition?: string | null
          receptive_welcome_template?: string | null
          scenario_detection_enabled?: boolean | null
          total_clients?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_scripts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_context_documents: {
        Row: {
          created_at: string
          error_message: string | null
          file_name: string
          file_size: number
          file_type: string
          id: string
          pinecone_index_name: string
          pinecone_vector_count: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          file_name: string
          file_size: number
          file_type: string
          id?: string
          pinecone_index_name: string
          pinecone_vector_count?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          pinecone_index_name?: string
          pinecone_vector_count?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_interaction_settings: {
        Row: {
          additional_instructions: string | null
          agent_avatar_url: string | null
          agent_color: string | null
          agent_description: string | null
          closing_instructions: string | null
          communication_style: string | null
          company_clients: string[] | null
          conversation_focus: string
          created_at: string
          empathy_level: string | null
          expertise_level: string | null
          formality_level: string | null
          humor_level: string | null
          id: string
          main_objective: string
          memory_amount: string | null
          name: string
          nickname: string | null
          organization_id: string | null
          personality_traits: string[] | null
          priority: string
          proactive_development_paper: string | null
          proactive_development_system: string | null
          proactive_hook_message: string | null
          proactive_opening_message: string | null
          proactivity_level: string | null
          receptive_deepening_question: string | null
          receptive_qualification_question: string | null
          receptive_value_proposition: string | null
          receptive_welcome_template: string | null
          rejection_action: string
          response_length: string | null
          scenario_detection_enabled: boolean | null
          script_id: string | null
          should_introduce_itself: boolean | null
          tone: string
          total_clients: string | null
          updated_at: string
        }
        Insert: {
          additional_instructions?: string | null
          agent_avatar_url?: string | null
          agent_color?: string | null
          agent_description?: string | null
          closing_instructions?: string | null
          communication_style?: string | null
          company_clients?: string[] | null
          conversation_focus: string
          created_at?: string
          empathy_level?: string | null
          expertise_level?: string | null
          formality_level?: string | null
          humor_level?: string | null
          id?: string
          main_objective: string
          memory_amount?: string | null
          name: string
          nickname?: string | null
          organization_id?: string | null
          personality_traits?: string[] | null
          priority?: string
          proactive_development_paper?: string | null
          proactive_development_system?: string | null
          proactive_hook_message?: string | null
          proactive_opening_message?: string | null
          proactivity_level?: string | null
          receptive_deepening_question?: string | null
          receptive_qualification_question?: string | null
          receptive_value_proposition?: string | null
          receptive_welcome_template?: string | null
          rejection_action?: string
          response_length?: string | null
          scenario_detection_enabled?: boolean | null
          script_id?: string | null
          should_introduce_itself?: boolean | null
          tone?: string
          total_clients?: string | null
          updated_at?: string
        }
        Update: {
          additional_instructions?: string | null
          agent_avatar_url?: string | null
          agent_color?: string | null
          agent_description?: string | null
          closing_instructions?: string | null
          communication_style?: string | null
          company_clients?: string[] | null
          conversation_focus?: string
          created_at?: string
          empathy_level?: string | null
          expertise_level?: string | null
          formality_level?: string | null
          humor_level?: string | null
          id?: string
          main_objective?: string
          memory_amount?: string | null
          name?: string
          nickname?: string | null
          organization_id?: string | null
          personality_traits?: string[] | null
          priority?: string
          proactive_development_paper?: string | null
          proactive_development_system?: string | null
          proactive_hook_message?: string | null
          proactive_opening_message?: string | null
          proactivity_level?: string | null
          receptive_deepening_question?: string | null
          receptive_qualification_question?: string | null
          receptive_value_proposition?: string | null
          receptive_welcome_template?: string | null
          rejection_action?: string
          response_length?: string | null
          scenario_detection_enabled?: boolean | null
          script_id?: string | null
          should_introduce_itself?: boolean | null
          tone?: string
          total_clients?: string | null
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
          {
            foreignKeyName: "ai_interaction_settings_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "agent_scripts"
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
      component_configurations: {
        Row: {
          component_id: string
          config: Json
          created_at: string
          id: string
          organization_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          component_id: string
          config?: Json
          created_at?: string
          id?: string
          organization_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          component_id?: string
          config?: Json
          created_at?: string
          id?: string
          organization_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "component_configurations_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "component_configurations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      components: {
        Row: {
          created_at: string
          description: string
          id: string
          identifier: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          identifier: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          identifier?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      lead_categories: {
        Row: {
          cnae_codes: string[] | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          cnae_codes?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          cnae_codes?: string[] | null
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
      lead_statuses: {
        Row: {
          ai_transition_condition: string | null
          created_at: string | null
          display_order: number
          id: string
          is_required: boolean
          label: string
          organization_id: string
          status_key: string
          updated_at: string | null
        }
        Insert: {
          ai_transition_condition?: string | null
          created_at?: string | null
          display_order?: number
          id?: string
          is_required?: boolean
          label: string
          organization_id: string
          status_key: string
          updated_at?: string | null
        }
        Update: {
          ai_transition_condition?: string | null
          created_at?: string | null
          display_order?: number
          id?: string
          is_required?: boolean
          label?: string
          organization_id?: string
          status_key?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_statuses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_value_entries: {
        Row: {
          created_at: string | null
          id: string
          lead_id: string
          value: number
          value_type_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          lead_id: string
          value?: number
          value_type_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          lead_id?: string
          value?: number
          value_type_id?: string
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
          created_at: string | null
          description: string | null
          display_order: number
          id: string
          key: string
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          key: string
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          key?: string
          name?: string
          organization_id?: string
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
          address: string | null
          ai_interaction_id: string | null
          annual_revenue: number | null
          category: string | null
          city: string | null
          company_name: string | null
          contact_email: string | null
          contact_whatsapp: string | null
          country: string | null
          created_at: string | null
          custom_values: Json | null
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
        }
        Insert: {
          address?: string | null
          ai_interaction_id?: string | null
          annual_revenue?: number | null
          category?: string | null
          city?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_whatsapp?: string | null
          country?: string | null
          created_at?: string | null
          custom_values?: Json | null
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
        }
        Update: {
          address?: string | null
          ai_interaction_id?: string | null
          annual_revenue?: number | null
          category?: string | null
          city?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_whatsapp?: string | null
          country?: string | null
          created_at?: string | null
          custom_values?: Json | null
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
      organization_components: {
        Row: {
          component_id: string
          created_at: string
          id: string
          organization_id: string
        }
        Insert: {
          component_id: string
          created_at?: string
          id?: string
          organization_id: string
        }
        Update: {
          component_id?: string
          created_at?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_components_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_components_organization_id_fkey"
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
          created_at: string
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          plan: string
          stripe_customer_id: string | null
          trial_ends_at: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          cnpj?: string | null
          company_name?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          plan?: string
          stripe_customer_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          cnpj?: string | null
          company_name?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          plan?: string
          stripe_customer_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          organization_id?: string | null
          updated_at?: string
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
          ai_interaction_id: string
          created_at: string | null
          id: string
          instance_name: string
          lead_id: string
          remote_jid: string
          scheduled_at: string
          status: string
          updated_at: string | null
        }
        Insert: {
          ai_interaction_id: string
          created_at?: string | null
          id?: string
          instance_name: string
          lead_id: string
          remote_jid: string
          scheduled_at: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          ai_interaction_id?: string
          created_at?: string | null
          id?: string
          instance_name?: string
          lead_id?: string
          remote_jid?: string
          scheduled_at?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_interactions_ai_interaction_id_fkey"
            columns: ["ai_interaction_id"]
            isOneToOne: false
            referencedRelation: "ai_interaction_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_interactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_messages: {
        Row: {
          created_at: string | null
          id: string
          image_url: string | null
          instance_name: string
          lead_id: string
          message: string
          remote_jid: string
          scheduled_at: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          instance_name: string
          lead_id: string
          message: string
          remote_jid: string
          scheduled_at: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          instance_name?: string
          lead_id?: string
          message?: string
          remote_jid?: string
          scheduled_at?: string
          status?: string
          updated_at?: string | null
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
          whatsapp_jid: string | null
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
          whatsapp_jid?: string | null
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
          whatsapp_jid?: string | null
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
      instagram_config_requests: {
        Row: {
          id: string
          organization_id: string | null
          business_name: string
          contact_email: string
          instagram_username: string
          instagram_profile_url: string | null
          facebook_page_url: string | null
          has_meta_app: boolean
          meta_app_id: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          business_name: string
          contact_email: string
          instagram_username: string
          instagram_profile_url?: string | null
          facebook_page_url?: string | null
          has_meta_app?: boolean
          meta_app_id?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          business_name?: string
          contact_email?: string
          instagram_username?: string
          instagram_profile_url?: string | null
          facebook_page_url?: string | null
          has_meta_app?: boolean
          meta_app_id?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_config_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      },
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_organization_id: { Args: never; Returns: string }
      initialize_organization_statuses: {
        Args: { org_id: string }
        Returns: undefined
      }
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
