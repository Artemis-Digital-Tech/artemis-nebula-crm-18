CREATE TABLE public.lead_value_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  key TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, key)
);

CREATE INDEX idx_lead_value_types_organization_id ON public.lead_value_types(organization_id);

ALTER TABLE public.lead_value_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view lead value types in their organization"
  ON public.lead_value_types FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert lead value types in their organization"
  ON public.lead_value_types FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update lead value types in their organization"
  ON public.lead_value_types FOR UPDATE
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete lead value types in their organization"
  ON public.lead_value_types FOR DELETE
  USING (organization_id = get_user_organization_id());

CREATE TABLE public.lead_value_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  value_type_id UUID NOT NULL REFERENCES public.lead_value_types(id) ON DELETE CASCADE,
  value NUMERIC(18, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(lead_id, value_type_id)
);

CREATE INDEX idx_lead_value_entries_lead_id ON public.lead_value_entries(lead_id);
CREATE INDEX idx_lead_value_entries_value_type_id ON public.lead_value_entries(value_type_id);

ALTER TABLE public.lead_value_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view lead value entries for leads in their organization"
  ON public.lead_value_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_value_entries.lead_id
      AND l.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Users can insert lead value entries for leads in their organization"
  ON public.lead_value_entries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_value_entries.lead_id
      AND l.organization_id = get_user_organization_id()
    )
    AND EXISTS (
      SELECT 1 FROM public.lead_value_types vt
      WHERE vt.id = lead_value_entries.value_type_id
      AND vt.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Users can update lead value entries for leads in their organization"
  ON public.lead_value_entries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_value_entries.lead_id
      AND l.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Users can delete lead value entries for leads in their organization"
  ON public.lead_value_entries FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_value_entries.lead_id
      AND l.organization_id = get_user_organization_id()
    )
  );
