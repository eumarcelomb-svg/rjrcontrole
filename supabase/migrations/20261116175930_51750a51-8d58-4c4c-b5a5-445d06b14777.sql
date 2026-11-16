CREATE TABLE public.fechamentos_folha (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_pagamento date NOT NULL UNIQUE,
  periodo_inicio date NOT NULL,
  periodo_fim date NOT NULL,
  itens jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fechamentos_folha TO anon, authenticated;
GRANT ALL ON public.fechamentos_folha TO service_role;
ALTER TABLE public.fechamentos_folha ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acesso app fechamentos" ON public.fechamentos_folha FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_fechamentos_folha_updated_at BEFORE UPDATE ON public.fechamentos_folha FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();