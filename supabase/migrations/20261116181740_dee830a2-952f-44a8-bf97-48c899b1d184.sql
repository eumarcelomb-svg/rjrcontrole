CREATE TABLE public.ajustes_extras_folha (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 data_pagamento date NOT NULL CHECK (extract(day from data_pagamento) IN (5,20)),
 colaborador_id uuid NOT NULL,
 colaborador_nome text NOT NULL,
 periodo_inicio date NOT NULL,
 periodo_fim date NOT NULL,
 horas50 numeric NOT NULL DEFAULT 0 CHECK (horas50 >= 0),
 horas100 numeric NOT NULL DEFAULT 0 CHECK (horas100 >= 0),
 motivo text NOT NULL CHECK (length(trim(motivo)) > 0),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (periodo_inicio <= periodo_fim),
 CHECK (horas50 + horas100 > 0),
 CHECK (periodo_fim <= CASE WHEN extract(day from data_pagamento) = 20 THEN date_trunc('month', data_pagamento)::date + 14 ELSE date_trunc('month', data_pagamento)::date - 1 END),
 UNIQUE (data_pagamento, colaborador_id, periodo_inicio, periodo_fim)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ajustes_extras_folha TO anon, authenticated;
GRANT ALL ON public.ajustes_extras_folha TO service_role;
ALTER TABLE public.ajustes_extras_folha ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acesso app ajustes extras folha" ON public.ajustes_extras_folha FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_ajustes_extras_folha_updated_at BEFORE UPDATE ON public.ajustes_extras_folha FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();