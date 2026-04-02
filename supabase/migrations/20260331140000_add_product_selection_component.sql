INSERT INTO public.components (name, description, identifier) VALUES
  (
    'Seleção de produtos',
    'Permite ao agente apresentar e ajudar o lead a escolher entre os produtos cadastrados no Nebula, usando o catálogo da organização e a ferramenta list_products quando necessário',
    'product_selection'
  )
ON CONFLICT (identifier) DO NOTHING;

INSERT INTO public.organization_components (organization_id, component_id)
SELECT o.id, c.id
FROM public.organizations o
CROSS JOIN public.components c
WHERE c.identifier = 'product_selection'
  AND NOT EXISTS (
    SELECT 1
    FROM public.organization_components oc
    WHERE oc.organization_id = o.id
      AND oc.component_id = c.id
  );
