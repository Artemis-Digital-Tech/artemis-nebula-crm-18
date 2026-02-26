


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."get_user_organization_id"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  org_id UUID;
BEGIN
  SELECT organization_id INTO org_id
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN org_id;
END;
$$;


ALTER FUNCTION "public"."get_user_organization_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_organization"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  PERFORM public.initialize_organization_statuses(NEW.id);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_organization"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  new_org_id UUID;
  org_name TEXT;
  user_plan TEXT;
  user_company_name TEXT;
  user_phone TEXT;
BEGIN
  -- Extract company information from metadata
  user_company_name := COALESCE(
    NEW.raw_user_meta_data->>'company_name',
    split_part(NEW.email, '@', 1) || '''s Company'
  );
  
  user_phone := NEW.raw_user_meta_data->>'phone';
  
  -- Get selected plan from metadata, default to 'free'
  user_plan := COALESCE(
    NEW.raw_user_meta_data->>'selected_plan',
    'free'
  );
  
  -- Create organization without logo (will be updated later if provided)
  INSERT INTO public.organizations (
    name, 
    company_name,
    phone,
    plan, 
    trial_ends_at
  )
  VALUES (
    user_company_name,
    user_company_name,
    user_phone,
    user_plan, 
    now() + interval '7 days'
  )
  RETURNING id INTO new_org_id;
  
  -- Create profile linked to organization
  INSERT INTO public.profiles (id, organization_id, display_name)
  VALUES (
    NEW.id,
    new_org_id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."initialize_organization_statuses"("org_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  max_order INTEGER;
  current_max_required_order INTEGER;
BEGIN
  -- Obter a ordem máxima dos status personalizados (não obrigatórios, exceto finished)
  SELECT COALESCE(MAX(display_order), 0) INTO max_order
  FROM public.lead_statuses
  WHERE organization_id = org_id 
    AND is_required = false 
    AND status_key != 'finished';
  
  -- Obter a ordem máxima dos status obrigatórios (exceto finished)
  SELECT COALESCE(MAX(display_order), 0) INTO current_max_required_order
  FROM public.lead_statuses
  WHERE organization_id = org_id 
    AND is_required = true 
    AND status_key != 'finished';
  
  -- Inserir todos os status obrigatórios se não existirem
  -- Ordem: 1=Novo, 2=Conversa Iniciada, 3=Proposta Enviada, 4=Reunião Agendada
  INSERT INTO public.lead_statuses (organization_id, status_key, label, is_required, display_order)
  VALUES 
    (org_id, 'new', 'Novo', true, 1),
    (org_id, 'conversation_started', 'Conversa Iniciada', true, 2),
    (org_id, 'proposal_sent', 'Proposta Enviada', true, 3),
    (org_id, 'meeting_scheduled', 'Reunião Agendada', true, 4),
    (org_id, 'finished', 'Finalizado', true, GREATEST(max_order, current_max_required_order) + 1000)
  ON CONFLICT (organization_id, status_key) 
  DO UPDATE SET
    label = EXCLUDED.label,
    is_required = EXCLUDED.is_required,
    display_order = CASE 
      WHEN EXCLUDED.status_key = 'finished' THEN GREATEST(max_order, current_max_required_order) + 1000
      ELSE EXCLUDED.display_order
    END;
  
  -- Garantir que os status obrigatórios (exceto finished) tenham a ordem correta
  UPDATE public.lead_statuses
  SET display_order = CASE status_key
    WHEN 'new' THEN 1
    WHEN 'conversation_started' THEN 2
    WHEN 'proposal_sent' THEN 3
    WHEN 'meeting_scheduled' THEN 4
    ELSE display_order
  END
  WHERE organization_id = org_id 
    AND is_required = true 
    AND status_key != 'finished';
  
  -- Sempre garantir que finished seja o último status
  UPDATE public.lead_statuses
  SET display_order = (
    SELECT COALESCE(MAX(display_order), 0) + 1
    FROM public.lead_statuses
    WHERE organization_id = org_id 
      AND status_key != 'finished'
  )
  WHERE organization_id = org_id 
    AND status_key = 'finished';
END;
$$;


ALTER FUNCTION "public"."initialize_organization_statuses"("org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."agent_component_configurations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agent_id" "uuid" NOT NULL,
    "component_id" "uuid" NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."agent_component_configurations" OWNER TO "postgres";


COMMENT ON TABLE "public"."agent_component_configurations" IS 'Stores agent-specific configuration data for components (e.g., which WhatsApp instance to use)';



COMMENT ON COLUMN "public"."agent_component_configurations"."config" IS 'JSON object containing agent-specific component configuration settings';



CREATE TABLE IF NOT EXISTS "public"."agent_components" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agent_id" "uuid" NOT NULL,
    "component_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."agent_components" OWNER TO "postgres";


COMMENT ON TABLE "public"."agent_components" IS 'Junction table linking agents to their enabled components';



CREATE TABLE IF NOT EXISTS "public"."agent_scripts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "scenario_detection_enabled" boolean DEFAULT false,
    "proactive_opening_message" "text",
    "proactive_hook_message" "text",
    "proactive_development_paper" "text",
    "proactive_development_system" "text",
    "receptive_welcome_template" "text",
    "receptive_qualification_question" "text",
    "receptive_deepening_question" "text",
    "receptive_value_proposition" "text",
    "company_clients" "text"[] DEFAULT ARRAY[]::"text"[],
    "total_clients" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."agent_scripts" OWNER TO "postgres";


COMMENT ON TABLE "public"."agent_scripts" IS 'Reusable conversation scripts/routing templates for agents';



COMMENT ON COLUMN "public"."agent_scripts"."scenario_detection_enabled" IS 'Enable automatic scenario detection (proactive vs receptive)';



COMMENT ON COLUMN "public"."agent_scripts"."proactive_opening_message" IS 'Opening message when bot initiates conversation (proactive scenario)';



COMMENT ON COLUMN "public"."agent_scripts"."proactive_hook_message" IS 'Hook message after initial response in proactive scenario';



COMMENT ON COLUMN "public"."agent_scripts"."proactive_development_paper" IS 'Development message when client uses paper/manual process';



COMMENT ON COLUMN "public"."agent_scripts"."proactive_development_system" IS 'Development message when client already has a system';



COMMENT ON COLUMN "public"."agent_scripts"."receptive_welcome_template" IS 'Welcome template when client initiates conversation';



COMMENT ON COLUMN "public"."agent_scripts"."receptive_qualification_question" IS 'Qualification question for receptive scenario';



COMMENT ON COLUMN "public"."agent_scripts"."receptive_deepening_question" IS 'Deepening question to understand current process';



COMMENT ON COLUMN "public"."agent_scripts"."receptive_value_proposition" IS 'Value proposition template for receptive scenario';



COMMENT ON COLUMN "public"."agent_scripts"."company_clients" IS 'Array of client names to mention when asked';



COMMENT ON COLUMN "public"."agent_scripts"."total_clients" IS 'Total number of clients to mention when asked';



CREATE TABLE IF NOT EXISTS "public"."ai_context_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_size" bigint NOT NULL,
    "file_type" "text" NOT NULL,
    "pinecone_index_name" "text" NOT NULL,
    "pinecone_vector_count" integer DEFAULT 0,
    "status" "text" DEFAULT 'processing'::"text" NOT NULL,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "valid_status" CHECK (("status" = ANY (ARRAY['processing'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."ai_context_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_interaction_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "conversation_focus" "text" NOT NULL,
    "priority" "text" DEFAULT 'medium'::"text" NOT NULL,
    "rejection_action" "text" DEFAULT 'follow_up'::"text" NOT NULL,
    "tone" "text" DEFAULT 'professional'::"text" NOT NULL,
    "main_objective" "text" NOT NULL,
    "additional_instructions" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "closing_instructions" "text",
    "organization_id" "uuid",
    "personality_traits" "text"[] DEFAULT ARRAY[]::"text"[],
    "communication_style" "text" DEFAULT 'balanced'::"text",
    "expertise_level" "text" DEFAULT 'intermediate'::"text",
    "response_length" "text" DEFAULT 'medium'::"text",
    "empathy_level" "text" DEFAULT 'moderate'::"text",
    "formality_level" "text" DEFAULT 'professional'::"text",
    "humor_level" "text" DEFAULT 'none'::"text",
    "proactivity_level" "text" DEFAULT 'moderate'::"text",
    "agent_avatar_url" "text",
    "agent_color" "text" DEFAULT '#3b82f6'::"text",
    "agent_description" "text",
    "nickname" "text",
    "should_introduce_itself" boolean DEFAULT true,
    "memory_amount" "text" DEFAULT 'medium'::"text",
    "scenario_detection_enabled" boolean DEFAULT false,
    "proactive_opening_message" "text",
    "proactive_hook_message" "text",
    "proactive_development_paper" "text",
    "proactive_development_system" "text",
    "receptive_welcome_template" "text",
    "receptive_qualification_question" "text",
    "receptive_deepening_question" "text",
    "receptive_value_proposition" "text",
    "company_clients" "text"[] DEFAULT ARRAY[]::"text"[],
    "total_clients" "text",
    "script_id" "uuid"
);


ALTER TABLE "public"."ai_interaction_settings" OWNER TO "postgres";


COMMENT ON COLUMN "public"."ai_interaction_settings"."closing_instructions" IS 'Instructions on how to close the conversation when the lead does not convert';



COMMENT ON COLUMN "public"."ai_interaction_settings"."nickname" IS 'Friendly nickname for the AI agent, used for display purposes';



COMMENT ON COLUMN "public"."ai_interaction_settings"."should_introduce_itself" IS 'Whether the agent should introduce itself at the start of conversations';



COMMENT ON COLUMN "public"."ai_interaction_settings"."memory_amount" IS 'Memory capacity for the agent: short, medium, long, or specific token amount';



COMMENT ON COLUMN "public"."ai_interaction_settings"."scenario_detection_enabled" IS 'Enable automatic scenario detection (proactive vs receptive)';



COMMENT ON COLUMN "public"."ai_interaction_settings"."proactive_opening_message" IS 'Opening message when bot initiates conversation (proactive scenario)';



COMMENT ON COLUMN "public"."ai_interaction_settings"."proactive_hook_message" IS 'Hook message after initial response in proactive scenario';



COMMENT ON COLUMN "public"."ai_interaction_settings"."proactive_development_paper" IS 'Development message when client uses paper/manual process';



COMMENT ON COLUMN "public"."ai_interaction_settings"."proactive_development_system" IS 'Development message when client already has a system';



COMMENT ON COLUMN "public"."ai_interaction_settings"."receptive_welcome_template" IS 'Welcome template when client initiates conversation';



COMMENT ON COLUMN "public"."ai_interaction_settings"."receptive_qualification_question" IS 'Qualification question for receptive scenario';



COMMENT ON COLUMN "public"."ai_interaction_settings"."receptive_deepening_question" IS 'Deepening question to understand current process';



COMMENT ON COLUMN "public"."ai_interaction_settings"."receptive_value_proposition" IS 'Value proposition template for receptive scenario';



COMMENT ON COLUMN "public"."ai_interaction_settings"."company_clients" IS 'Array of client names to mention when asked';



COMMENT ON COLUMN "public"."ai_interaction_settings"."total_clients" IS 'Total number of clients to mention when asked';



CREATE TABLE IF NOT EXISTS "public"."company_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "google_drive_file_id" "text" NOT NULL,
    "google_drive_folder_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."company_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."component_configurations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "component_id" "uuid" NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid"
);


ALTER TABLE "public"."component_configurations" OWNER TO "postgres";


COMMENT ON TABLE "public"."component_configurations" IS 'Stores configuration data (API keys, secrets, etc.) for each component';



COMMENT ON COLUMN "public"."component_configurations"."config" IS 'JSON object containing component-specific configuration settings';



COMMENT ON COLUMN "public"."component_configurations"."user_id" IS 'ID do usuário que possui esta configuração. Permite que cada usuário tenha sua própria configuração para cada componente.';



CREATE TABLE IF NOT EXISTS "public"."components" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "identifier" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."components" OWNER TO "postgres";


COMMENT ON TABLE "public"."components" IS 'Available components/capabilities that agents can use';



CREATE TABLE IF NOT EXISTS "public"."lead_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid"
);


ALTER TABLE "public"."lead_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lead_statuses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "status_key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "is_required" boolean DEFAULT false NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "ai_transition_condition" "text"
);


ALTER TABLE "public"."lead_statuses" OWNER TO "postgres";


COMMENT ON COLUMN "public"."lead_statuses"."ai_transition_condition" IS 'Texto livre que descreve quando a IA deve mudar o lead para esta etapa do funil';



CREATE TABLE IF NOT EXISTS "public"."leads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "category" "text",
    "status" "text" DEFAULT 'novo'::"text" NOT NULL,
    "contact_email" "text",
    "contact_whatsapp" "text",
    "source" "text",
    "integration_start_time" time with time zone,
    "payment_link_url" "text",
    "payment_stripe_id" "text",
    "payment_status" "text" DEFAULT 'nao_criado'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "payment_amount" numeric,
    "paid_at" timestamp with time zone,
    "whatsapp_verified" boolean DEFAULT false,
    "ai_interaction_id" "uuid",
    "remote_jid" "text",
    "organization_id" "uuid",
    "is_test" boolean DEFAULT false,
    "company_name" "text",
    "job_title" "text",
    "phone" "text",
    "address" "text",
    "city" "text",
    "state" "text",
    "zip_code" "text",
    "country" "text" DEFAULT 'Brasil'::"text",
    "website" "text",
    "linkedin_url" "text",
    "notes" "text",
    "industry" "text",
    "annual_revenue" numeric(15,2),
    "number_of_employees" integer,
    "custom_values" "jsonb" DEFAULT '[]'::"jsonb",
    CONSTRAINT "valid_payment_status" CHECK (("payment_status" = ANY (ARRAY['nao_criado'::"text", 'link_gerado'::"text", 'pago'::"text", 'expirado'::"text"])))
);


ALTER TABLE "public"."leads" OWNER TO "postgres";


COMMENT ON COLUMN "public"."leads"."payment_amount" IS 'Valor da proposta em Reais (ex: 1500.50)';



COMMENT ON COLUMN "public"."leads"."paid_at" IS 'Data e hora em que o pagamento foi confirmado';



COMMENT ON COLUMN "public"."leads"."whatsapp_verified" IS 'Indica se o número de WhatsApp foi verificado como válido';



COMMENT ON COLUMN "public"."leads"."is_test" IS 'Indicates if this lead is a test lead created in the playground. Test leads should not be visible outside the playground.';



COMMENT ON COLUMN "public"."leads"."company_name" IS 'Nome da empresa do lead';



COMMENT ON COLUMN "public"."leads"."job_title" IS 'Cargo do lead na empresa';



COMMENT ON COLUMN "public"."leads"."phone" IS 'Telefone fixo do lead (além do WhatsApp)';



COMMENT ON COLUMN "public"."leads"."address" IS 'Endereço completo do lead';



COMMENT ON COLUMN "public"."leads"."city" IS 'Cidade do lead';



COMMENT ON COLUMN "public"."leads"."state" IS 'Estado do lead';



COMMENT ON COLUMN "public"."leads"."zip_code" IS 'CEP do lead';



COMMENT ON COLUMN "public"."leads"."country" IS 'País do lead (padrão: Brasil)';



COMMENT ON COLUMN "public"."leads"."website" IS 'Website da empresa do lead';



COMMENT ON COLUMN "public"."leads"."linkedin_url" IS 'URL do perfil LinkedIn do lead';



COMMENT ON COLUMN "public"."leads"."notes" IS 'Notas adicionais sobre o lead';



COMMENT ON COLUMN "public"."leads"."industry" IS 'Setor/indústria da empresa do lead';



COMMENT ON COLUMN "public"."leads"."annual_revenue" IS 'Receita anual da empresa em R$';



COMMENT ON COLUMN "public"."leads"."number_of_employees" IS 'Número de funcionários da empresa';



COMMENT ON COLUMN "public"."leads"."custom_values" IS 'Array JSONB de valores personalizados com descrições. Formato: [{"value": "1000.00", "description": "Descrição"}]';



CREATE TABLE IF NOT EXISTS "public"."organization_components" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "component_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."organization_components" OWNER TO "postgres";


COMMENT ON TABLE "public"."organization_components" IS 'Controls which components are available to each organization';



CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "plan" "text" DEFAULT 'free'::"text" NOT NULL,
    "trial_ends_at" timestamp with time zone,
    "stripe_customer_id" "text",
    "logo_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "company_name" "text",
    "cnpj" "text",
    "phone" "text",
    "address" "text",
    "website" "text",
    CONSTRAINT "organizations_plan_check" CHECK (("plan" = ANY (ARRAY['free'::"text", 'pro'::"text"])))
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "organization_id" "uuid",
    "display_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scheduled_interactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lead_id" "uuid" NOT NULL,
    "ai_interaction_id" "uuid" NOT NULL,
    "instance_name" "text" NOT NULL,
    "remote_jid" "text" NOT NULL,
    "scheduled_at" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_status" CHECK (("status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."scheduled_interactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scheduled_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lead_id" "uuid" NOT NULL,
    "instance_name" "text" NOT NULL,
    "remote_jid" "text" NOT NULL,
    "message" "text" NOT NULL,
    "image_url" "text",
    "scheduled_at" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_status" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'failed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."scheduled_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "default_integration_start_time" time with time zone,
    "n8n_webhook_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "default_ai_interaction_id" "uuid",
    "organization_id" "uuid",
    "default_message" "text",
    "default_image_url" "text"
);


ALTER TABLE "public"."settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."whatsapp_instances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "instance_name" "text" NOT NULL,
    "instance_id" "text",
    "status" "text" DEFAULT 'created'::"text" NOT NULL,
    "qr_code" "text",
    "api_key" "text",
    "webhook_url" "text",
    "phone_number" "text",
    "connected_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "whatsapp_jid" "text"
);


ALTER TABLE "public"."whatsapp_instances" OWNER TO "postgres";


ALTER TABLE ONLY "public"."agent_component_configurations"
    ADD CONSTRAINT "agent_component_configurations_agent_id_component_id_key" UNIQUE ("agent_id", "component_id");



ALTER TABLE ONLY "public"."agent_component_configurations"
    ADD CONSTRAINT "agent_component_configurations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_components"
    ADD CONSTRAINT "agent_components_agent_id_component_id_key" UNIQUE ("agent_id", "component_id");



ALTER TABLE ONLY "public"."agent_components"
    ADD CONSTRAINT "agent_components_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_scripts"
    ADD CONSTRAINT "agent_scripts_organization_id_name_key" UNIQUE ("organization_id", "name");



ALTER TABLE ONLY "public"."agent_scripts"
    ADD CONSTRAINT "agent_scripts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_context_documents"
    ADD CONSTRAINT "ai_context_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_interaction_settings"
    ADD CONSTRAINT "ai_interaction_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_documents"
    ADD CONSTRAINT "company_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."component_configurations"
    ADD CONSTRAINT "component_configurations_component_id_user_id_key" UNIQUE ("component_id", "user_id");



ALTER TABLE ONLY "public"."component_configurations"
    ADD CONSTRAINT "component_configurations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."components"
    ADD CONSTRAINT "components_identifier_key" UNIQUE ("identifier");



ALTER TABLE ONLY "public"."components"
    ADD CONSTRAINT "components_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lead_categories"
    ADD CONSTRAINT "lead_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lead_statuses"
    ADD CONSTRAINT "lead_statuses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_components"
    ADD CONSTRAINT "organization_components_organization_id_component_id_key" UNIQUE ("organization_id", "component_id");



ALTER TABLE ONLY "public"."organization_components"
    ADD CONSTRAINT "organization_components_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scheduled_interactions"
    ADD CONSTRAINT "scheduled_interactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scheduled_messages"
    ADD CONSTRAINT "scheduled_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lead_statuses"
    ADD CONSTRAINT "unique_organization_status_key" UNIQUE ("organization_id", "status_key");



ALTER TABLE ONLY "public"."whatsapp_instances"
    ADD CONSTRAINT "whatsapp_instances_instance_name_key" UNIQUE ("instance_name");



ALTER TABLE ONLY "public"."whatsapp_instances"
    ADD CONSTRAINT "whatsapp_instances_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_agent_component_configurations_agent_id" ON "public"."agent_component_configurations" USING "btree" ("agent_id");



CREATE INDEX "idx_agent_component_configurations_component_id" ON "public"."agent_component_configurations" USING "btree" ("component_id");



CREATE INDEX "idx_agent_components_agent_id" ON "public"."agent_components" USING "btree" ("agent_id");



CREATE INDEX "idx_agent_components_component_id" ON "public"."agent_components" USING "btree" ("component_id");



CREATE INDEX "idx_agent_scripts_organization_id" ON "public"."agent_scripts" USING "btree" ("organization_id");



CREATE INDEX "idx_ai_context_documents_pinecone_index" ON "public"."ai_context_documents" USING "btree" ("pinecone_index_name");



CREATE INDEX "idx_ai_context_documents_status" ON "public"."ai_context_documents" USING "btree" ("status");



CREATE INDEX "idx_ai_context_documents_user_id" ON "public"."ai_context_documents" USING "btree" ("user_id");



CREATE INDEX "idx_ai_interaction_settings_organization_id" ON "public"."ai_interaction_settings" USING "btree" ("organization_id");



CREATE INDEX "idx_ai_interaction_settings_script_id" ON "public"."ai_interaction_settings" USING "btree" ("script_id");



CREATE INDEX "idx_component_configurations_component_id" ON "public"."component_configurations" USING "btree" ("component_id");



CREATE INDEX "idx_component_configurations_component_user" ON "public"."component_configurations" USING "btree" ("component_id", "user_id");



CREATE INDEX "idx_component_configurations_user_id" ON "public"."component_configurations" USING "btree" ("user_id");



CREATE INDEX "idx_components_identifier" ON "public"."components" USING "btree" ("identifier");



CREATE INDEX "idx_lead_categories_organization_id" ON "public"."lead_categories" USING "btree" ("organization_id");



CREATE INDEX "idx_lead_statuses_display_order" ON "public"."lead_statuses" USING "btree" ("organization_id", "display_order");



CREATE INDEX "idx_lead_statuses_organization_id" ON "public"."lead_statuses" USING "btree" ("organization_id");



CREATE INDEX "idx_leads_city" ON "public"."leads" USING "btree" ("city");



CREATE INDEX "idx_leads_company_name" ON "public"."leads" USING "btree" ("company_name");



CREATE INDEX "idx_leads_custom_values" ON "public"."leads" USING "gin" ("custom_values");



CREATE INDEX "idx_leads_industry" ON "public"."leads" USING "btree" ("industry");



CREATE INDEX "idx_leads_is_test" ON "public"."leads" USING "btree" ("is_test");



CREATE INDEX "idx_leads_organization_id" ON "public"."leads" USING "btree" ("organization_id");



CREATE INDEX "idx_leads_payment_amount" ON "public"."leads" USING "btree" ("payment_amount");



CREATE INDEX "idx_leads_state" ON "public"."leads" USING "btree" ("state");



CREATE INDEX "idx_leads_whatsapp_verified" ON "public"."leads" USING "btree" ("whatsapp_verified") WHERE ("whatsapp_verified" = true);



CREATE INDEX "idx_organization_components_component_id" ON "public"."organization_components" USING "btree" ("component_id");



CREATE INDEX "idx_organization_components_organization_id" ON "public"."organization_components" USING "btree" ("organization_id");



CREATE INDEX "idx_organizations_plan" ON "public"."organizations" USING "btree" ("plan");



CREATE INDEX "idx_organizations_stripe_customer_id" ON "public"."organizations" USING "btree" ("stripe_customer_id");



CREATE INDEX "idx_organizations_trial_ends_at" ON "public"."organizations" USING "btree" ("trial_ends_at");



CREATE INDEX "idx_profiles_organization_id" ON "public"."profiles" USING "btree" ("organization_id");



CREATE INDEX "idx_scheduled_interactions_lead_id" ON "public"."scheduled_interactions" USING "btree" ("lead_id");



CREATE INDEX "idx_scheduled_interactions_status_scheduled_at" ON "public"."scheduled_interactions" USING "btree" ("status", "scheduled_at");



CREATE INDEX "idx_scheduled_messages_status_scheduled_at" ON "public"."scheduled_messages" USING "btree" ("status", "scheduled_at");



CREATE INDEX "idx_settings_organization_id" ON "public"."settings" USING "btree" ("organization_id");



CREATE INDEX "idx_whatsapp_instances_jid" ON "public"."whatsapp_instances" USING "btree" ("whatsapp_jid");



CREATE INDEX "idx_whatsapp_instances_organization_id" ON "public"."whatsapp_instances" USING "btree" ("organization_id");



CREATE INDEX "idx_whatsapp_instances_status" ON "public"."whatsapp_instances" USING "btree" ("status");



CREATE OR REPLACE TRIGGER "on_organization_created" AFTER INSERT ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_organization"();



CREATE OR REPLACE TRIGGER "update_agent_component_configurations_updated_at" BEFORE UPDATE ON "public"."agent_component_configurations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_agent_scripts_updated_at" BEFORE UPDATE ON "public"."agent_scripts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_ai_context_documents_updated_at" BEFORE UPDATE ON "public"."ai_context_documents" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_ai_interaction_settings_updated_at" BEFORE UPDATE ON "public"."ai_interaction_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_company_documents_updated_at" BEFORE UPDATE ON "public"."company_documents" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_component_configurations_updated_at" BEFORE UPDATE ON "public"."component_configurations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_components_updated_at" BEFORE UPDATE ON "public"."components" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_lead_categories_updated_at" BEFORE UPDATE ON "public"."lead_categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_lead_statuses_updated_at" BEFORE UPDATE ON "public"."lead_statuses" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_leads_updated_at" BEFORE UPDATE ON "public"."leads" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_organizations_updated_at" BEFORE UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_scheduled_interactions_updated_at" BEFORE UPDATE ON "public"."scheduled_interactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_scheduled_messages_updated_at" BEFORE UPDATE ON "public"."scheduled_messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_settings_updated_at" BEFORE UPDATE ON "public"."settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_whatsapp_instances_updated_at" BEFORE UPDATE ON "public"."whatsapp_instances" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."agent_component_configurations"
    ADD CONSTRAINT "agent_component_configurations_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."ai_interaction_settings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_component_configurations"
    ADD CONSTRAINT "agent_component_configurations_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "public"."components"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_components"
    ADD CONSTRAINT "agent_components_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."ai_interaction_settings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_components"
    ADD CONSTRAINT "agent_components_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "public"."components"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_scripts"
    ADD CONSTRAINT "agent_scripts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_context_documents"
    ADD CONSTRAINT "ai_context_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_interaction_settings"
    ADD CONSTRAINT "ai_interaction_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_interaction_settings"
    ADD CONSTRAINT "ai_interaction_settings_script_id_fkey" FOREIGN KEY ("script_id") REFERENCES "public"."agent_scripts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."company_documents"
    ADD CONSTRAINT "company_documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."component_configurations"
    ADD CONSTRAINT "component_configurations_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "public"."components"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."component_configurations"
    ADD CONSTRAINT "component_configurations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lead_categories"
    ADD CONSTRAINT "lead_categories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lead_statuses"
    ADD CONSTRAINT "lead_statuses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_ai_interaction_id_fkey" FOREIGN KEY ("ai_interaction_id") REFERENCES "public"."ai_interaction_settings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_components"
    ADD CONSTRAINT "organization_components_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "public"."components"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_components"
    ADD CONSTRAINT "organization_components_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scheduled_interactions"
    ADD CONSTRAINT "scheduled_interactions_ai_interaction_id_fkey" FOREIGN KEY ("ai_interaction_id") REFERENCES "public"."ai_interaction_settings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scheduled_interactions"
    ADD CONSTRAINT "scheduled_interactions_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scheduled_messages"
    ADD CONSTRAINT "scheduled_messages_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_default_ai_interaction_id_fkey" FOREIGN KEY ("default_ai_interaction_id") REFERENCES "public"."ai_interaction_settings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."whatsapp_instances"
    ADD CONSTRAINT "whatsapp_instances_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



CREATE POLICY "Anyone can delete scheduled interactions" ON "public"."scheduled_interactions" FOR DELETE USING (true);



CREATE POLICY "Anyone can delete scheduled messages" ON "public"."scheduled_messages" FOR DELETE USING (true);



CREATE POLICY "Anyone can insert scheduled interactions" ON "public"."scheduled_interactions" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can insert scheduled messages" ON "public"."scheduled_messages" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can update scheduled interactions" ON "public"."scheduled_interactions" FOR UPDATE USING (true);



CREATE POLICY "Anyone can update scheduled messages" ON "public"."scheduled_messages" FOR UPDATE USING (true);



CREATE POLICY "Anyone can view scheduled interactions" ON "public"."scheduled_interactions" FOR SELECT USING (true);



CREATE POLICY "Anyone can view scheduled messages" ON "public"."scheduled_messages" FOR SELECT USING (true);



CREATE POLICY "Authenticated users can delete component configurations" ON "public"."component_configurations" FOR DELETE USING ((("auth"."role"() = 'authenticated'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."components"
  WHERE ("components"."id" = "component_configurations"."component_id"))) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."organization_id" IS NOT NULL))))));



CREATE POLICY "Authenticated users can insert component configurations" ON "public"."component_configurations" FOR INSERT WITH CHECK ((("auth"."role"() = 'authenticated'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."components"
  WHERE ("components"."id" = "component_configurations"."component_id"))) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."organization_id" IS NOT NULL))))));



CREATE POLICY "Authenticated users can update component configurations" ON "public"."component_configurations" FOR UPDATE USING ((("auth"."role"() = 'authenticated'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."components"
  WHERE ("components"."id" = "component_configurations"."component_id"))) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."organization_id" IS NOT NULL))))));



CREATE POLICY "Authenticated users can view component configurations" ON "public"."component_configurations" FOR SELECT USING ((("auth"."role"() = 'authenticated'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."components"
  WHERE ("components"."id" = "component_configurations"."component_id"))) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."organization_id" IS NOT NULL))))));



CREATE POLICY "Authenticated users can view components" ON "public"."components" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Users can delete AI interaction settings in their organization" ON "public"."ai_interaction_settings" FOR DELETE USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can delete agent component configurations for their organ" ON "public"."agent_component_configurations" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."ai_interaction_settings"
  WHERE (("ai_interaction_settings"."id" = "agent_component_configurations"."agent_id") AND ("ai_interaction_settings"."organization_id" IN ( SELECT "profiles"."organization_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"())))))));



CREATE POLICY "Users can delete agent components for their organization agents" ON "public"."agent_components" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."ai_interaction_settings"
  WHERE (("ai_interaction_settings"."id" = "agent_components"."agent_id") AND ("ai_interaction_settings"."organization_id" IN ( SELECT "profiles"."organization_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"())))))));



CREATE POLICY "Users can delete agent scripts in their organization" ON "public"."agent_scripts" FOR DELETE USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can delete documents in their organization" ON "public"."company_documents" FOR DELETE USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can delete instances in their organization" ON "public"."whatsapp_instances" FOR DELETE USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can delete lead categories in their organization" ON "public"."lead_categories" FOR DELETE USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can delete lead statuses in their organization" ON "public"."lead_statuses" FOR DELETE USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can delete leads in their organization" ON "public"."leads" FOR DELETE USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can delete organization components for their organization" ON "public"."organization_components" FOR DELETE USING (("organization_id" IN ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can delete their own AI context documents" ON "public"."ai_context_documents" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete their own component configurations" ON "public"."component_configurations" FOR DELETE USING ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."components"
  WHERE (("components"."id" = "component_configurations"."component_id") AND (EXISTS ( SELECT 1
           FROM "public"."organization_components"
          WHERE (("organization_components"."component_id" = "components"."id") AND ("organization_components"."organization_id" IN ( SELECT "profiles"."organization_id"
                   FROM "public"."profiles"
                  WHERE ("profiles"."id" = "auth"."uid"())))))))))));



CREATE POLICY "Users can insert AI interaction settings in their organization" ON "public"."ai_interaction_settings" FOR INSERT WITH CHECK (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can insert agent component configurations for their organ" ON "public"."agent_component_configurations" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."ai_interaction_settings"
  WHERE (("ai_interaction_settings"."id" = "agent_component_configurations"."agent_id") AND ("ai_interaction_settings"."organization_id" IN ( SELECT "profiles"."organization_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"())))))));



CREATE POLICY "Users can insert agent components for their organization agents" ON "public"."agent_components" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."ai_interaction_settings"
  WHERE (("ai_interaction_settings"."id" = "agent_components"."agent_id") AND ("ai_interaction_settings"."organization_id" IN ( SELECT "profiles"."organization_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"())))))));



CREATE POLICY "Users can insert agent scripts in their organization" ON "public"."agent_scripts" FOR INSERT WITH CHECK (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can insert documents in their organization" ON "public"."company_documents" FOR INSERT WITH CHECK (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can insert instances in their organization" ON "public"."whatsapp_instances" FOR INSERT WITH CHECK (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can insert lead categories in their organization" ON "public"."lead_categories" FOR INSERT WITH CHECK (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can insert lead statuses in their organization" ON "public"."lead_statuses" FOR INSERT WITH CHECK (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can insert leads in their organization" ON "public"."leads" FOR INSERT WITH CHECK (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can insert organization components for their organization" ON "public"."organization_components" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can insert settings in their organization" ON "public"."settings" FOR INSERT WITH CHECK (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can insert their own AI context documents" ON "public"."ai_context_documents" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert their own component configurations" ON "public"."component_configurations" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."components"
  WHERE (("components"."id" = "component_configurations"."component_id") AND (EXISTS ( SELECT 1
           FROM "public"."organization_components"
          WHERE (("organization_components"."component_id" = "components"."id") AND ("organization_components"."organization_id" IN ( SELECT "profiles"."organization_id"
                   FROM "public"."profiles"
                  WHERE ("profiles"."id" = "auth"."uid"())))))))))));



CREATE POLICY "Users can update AI interaction settings in their organization" ON "public"."ai_interaction_settings" FOR UPDATE USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can update agent component configurations for their organ" ON "public"."agent_component_configurations" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."ai_interaction_settings"
  WHERE (("ai_interaction_settings"."id" = "agent_component_configurations"."agent_id") AND ("ai_interaction_settings"."organization_id" IN ( SELECT "profiles"."organization_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"())))))));



CREATE POLICY "Users can update agent scripts in their organization" ON "public"."agent_scripts" FOR UPDATE USING (("organization_id" = "public"."get_user_organization_id"())) WITH CHECK (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can update documents in their organization" ON "public"."company_documents" FOR UPDATE USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can update instances in their organization" ON "public"."whatsapp_instances" FOR UPDATE USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can update lead categories in their organization" ON "public"."lead_categories" FOR UPDATE USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can update lead statuses in their organization" ON "public"."lead_statuses" FOR UPDATE USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can update leads in their organization" ON "public"."leads" FOR UPDATE USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can update settings in their organization" ON "public"."settings" FOR UPDATE USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can update their organization" ON "public"."organizations" FOR UPDATE USING (("id" IN ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can update their own AI context documents" ON "public"."ai_context_documents" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own component configurations" ON "public"."component_configurations" FOR UPDATE USING ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."components"
  WHERE (("components"."id" = "component_configurations"."component_id") AND (EXISTS ( SELECT 1
           FROM "public"."organization_components"
          WHERE (("organization_components"."component_id" = "components"."id") AND ("organization_components"."organization_id" IN ( SELECT "profiles"."organization_id"
                   FROM "public"."profiles"
                  WHERE ("profiles"."id" = "auth"."uid"())))))))))));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("id" = "auth"."uid"()));



CREATE POLICY "Users can view AI interaction settings in their organization" ON "public"."ai_interaction_settings" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can view agent component configurations for their organiz" ON "public"."agent_component_configurations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."ai_interaction_settings"
  WHERE (("ai_interaction_settings"."id" = "agent_component_configurations"."agent_id") AND ("ai_interaction_settings"."organization_id" IN ( SELECT "profiles"."organization_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"())))))));



CREATE POLICY "Users can view agent components for their organization agents" ON "public"."agent_components" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."ai_interaction_settings"
  WHERE (("ai_interaction_settings"."id" = "agent_components"."agent_id") AND ("ai_interaction_settings"."organization_id" IN ( SELECT "profiles"."organization_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"())))))));



CREATE POLICY "Users can view agent scripts in their organization" ON "public"."agent_scripts" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can view documents in their organization" ON "public"."company_documents" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can view instances in their organization" ON "public"."whatsapp_instances" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can view lead categories in their organization" ON "public"."lead_categories" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can view lead statuses in their organization" ON "public"."lead_statuses" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can view leads in their organization" ON "public"."leads" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can view organization components for their organization" ON "public"."organization_components" FOR SELECT USING (("organization_id" IN ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view organizations they belong to" ON "public"."organizations" FOR SELECT USING (("id" IN ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view settings in their organization" ON "public"."settings" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can view their own AI context documents" ON "public"."ai_context_documents" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own component configurations" ON "public"."component_configurations" FOR SELECT USING ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."components"
  WHERE (("components"."id" = "component_configurations"."component_id") AND (EXISTS ( SELECT 1
           FROM "public"."organization_components"
          WHERE (("organization_components"."component_id" = "components"."id") AND ("organization_components"."organization_id" IN ( SELECT "profiles"."organization_id"
                   FROM "public"."profiles"
                  WHERE ("profiles"."id" = "auth"."uid"())))))))))));



CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT USING (("id" = "auth"."uid"()));



ALTER TABLE "public"."agent_component_configurations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_components" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_scripts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_context_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_interaction_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."component_configurations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."components" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lead_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lead_statuses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."leads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_components" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scheduled_interactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scheduled_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."whatsapp_instances" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."get_user_organization_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_organization_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_organization_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_organization"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_organization"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_organization"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."initialize_organization_statuses"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."initialize_organization_statuses"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."initialize_organization_statuses"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."agent_component_configurations" TO "anon";
GRANT ALL ON TABLE "public"."agent_component_configurations" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_component_configurations" TO "service_role";



GRANT ALL ON TABLE "public"."agent_components" TO "anon";
GRANT ALL ON TABLE "public"."agent_components" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_components" TO "service_role";



GRANT ALL ON TABLE "public"."agent_scripts" TO "anon";
GRANT ALL ON TABLE "public"."agent_scripts" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_scripts" TO "service_role";



GRANT ALL ON TABLE "public"."ai_context_documents" TO "anon";
GRANT ALL ON TABLE "public"."ai_context_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_context_documents" TO "service_role";



GRANT ALL ON TABLE "public"."ai_interaction_settings" TO "anon";
GRANT ALL ON TABLE "public"."ai_interaction_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_interaction_settings" TO "service_role";



GRANT ALL ON TABLE "public"."company_documents" TO "anon";
GRANT ALL ON TABLE "public"."company_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."company_documents" TO "service_role";



GRANT ALL ON TABLE "public"."component_configurations" TO "anon";
GRANT ALL ON TABLE "public"."component_configurations" TO "authenticated";
GRANT ALL ON TABLE "public"."component_configurations" TO "service_role";



GRANT ALL ON TABLE "public"."components" TO "anon";
GRANT ALL ON TABLE "public"."components" TO "authenticated";
GRANT ALL ON TABLE "public"."components" TO "service_role";



GRANT ALL ON TABLE "public"."lead_categories" TO "anon";
GRANT ALL ON TABLE "public"."lead_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."lead_categories" TO "service_role";



GRANT ALL ON TABLE "public"."lead_statuses" TO "anon";
GRANT ALL ON TABLE "public"."lead_statuses" TO "authenticated";
GRANT ALL ON TABLE "public"."lead_statuses" TO "service_role";



GRANT ALL ON TABLE "public"."leads" TO "anon";
GRANT ALL ON TABLE "public"."leads" TO "authenticated";
GRANT ALL ON TABLE "public"."leads" TO "service_role";



GRANT ALL ON TABLE "public"."organization_components" TO "anon";
GRANT ALL ON TABLE "public"."organization_components" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_components" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."scheduled_interactions" TO "anon";
GRANT ALL ON TABLE "public"."scheduled_interactions" TO "authenticated";
GRANT ALL ON TABLE "public"."scheduled_interactions" TO "service_role";



GRANT ALL ON TABLE "public"."scheduled_messages" TO "anon";
GRANT ALL ON TABLE "public"."scheduled_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."scheduled_messages" TO "service_role";



GRANT ALL ON TABLE "public"."settings" TO "anon";
GRANT ALL ON TABLE "public"."settings" TO "authenticated";
GRANT ALL ON TABLE "public"."settings" TO "service_role";



GRANT ALL ON TABLE "public"."whatsapp_instances" TO "anon";
GRANT ALL ON TABLE "public"."whatsapp_instances" TO "authenticated";
GRANT ALL ON TABLE "public"."whatsapp_instances" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































