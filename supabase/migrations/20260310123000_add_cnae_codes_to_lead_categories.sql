ALTER TABLE public.lead_categories
ADD COLUMN IF NOT EXISTS cnae_codes text[] DEFAULT '{}';
