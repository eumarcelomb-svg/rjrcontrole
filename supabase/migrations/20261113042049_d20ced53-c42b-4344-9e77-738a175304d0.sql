CREATE TABLE public.entregas_epi (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 colaborador_id uuid NOT NULL,
 colaborador_nome text NOT NULL,
 colaborador_funcao text NOT NULL,
 equipamento text NOT NULL CHECK (length(trim(equipamento)) > 0),
 quantidade integer NOT NULL CHECK (quantidade > 0),
 ca text NOT NULL DEFAULT '',
 data_entrega date NOT NULL,
 responsavel text NOT NULL DEFAULT '',
 observacoes text NOT NULL DEFAULT '',
 assinatura_confirmada boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entregas_epi TO anon, authenticated;
GRANT ALL ON public.entregas_epi TO service_role;
ALTER TABLE public.entregas_epi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acesso app entregas epi" ON public.entregas_epi FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER t_entregas_epi_upd BEFORE UPDATE ON public.entregas_epi FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX entregas_epi_data_idx ON public.entregas_epi(data_entrega DESC, id);
CREATE INDEX entregas_epi_colaborador_idx ON public.entregas_epi(colaborador_id);