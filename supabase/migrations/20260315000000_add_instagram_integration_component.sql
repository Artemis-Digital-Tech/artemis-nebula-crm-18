-- Migration: Add instagram_integration component
-- Enables agents to interact via Instagram Direct (DMs) when configured

INSERT INTO public.components (name, description, identifier) VALUES
  ('Integração com Instagram', 'Permite ao agente interagir via Direct do Instagram', 'instagram_integration')
ON CONFLICT (identifier) DO NOTHING;
