CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  price NUMERIC(12, 2),
  currency TEXT NOT NULL DEFAULT 'BRL',
  features TEXT,
  target_audience TEXT,
  use_cases TEXT,
  differentiators TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_products_organization_id ON public.products(organization_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view products in their organization" ON public.products;
DROP POLICY IF EXISTS "Users can insert products in their organization" ON public.products;
DROP POLICY IF EXISTS "Users can update products in their organization" ON public.products;
DROP POLICY IF EXISTS "Users can delete products in their organization" ON public.products;

CREATE POLICY "Users can view products in their organization"
  ON public.products FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert products in their organization"
  ON public.products FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update products in their organization"
  ON public.products FOR UPDATE
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete products in their organization"
  ON public.products FOR DELETE
  USING (organization_id = get_user_organization_id());
