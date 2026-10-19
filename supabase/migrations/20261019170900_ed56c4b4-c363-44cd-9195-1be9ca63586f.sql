CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.colaboradores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cpf text NOT NULL UNIQUE,
  funcao text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.registros_dia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  data date NOT NULL,
  status text CHECK (status IN ('P','F','J')),
  horas_manuais numeric,
  entrada_min integer,
  saida_min integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (colaborador_id, data)
);
CREATE TABLE public.feriados (
  data date PRIMARY KEY,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.salarios_funcao (
  funcao text PRIMARY KEY,
  salario numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.configuracoes (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  divisor numeric NOT NULL DEFAULT 220,
  pct50 numeric NOT NULL DEFAULT 50,
  pct100 numeric NOT NULL DEFAULT 100,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.colaboradores, public.registros_dia, public.feriados, public.salarios_funcao, public.configuracoes TO anon, authenticated;
GRANT ALL ON public.colaboradores, public.registros_dia, public.feriados, public.salarios_funcao, public.configuracoes TO service_role;

ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_dia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feriados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salarios_funcao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acesso app colaboradores" ON public.colaboradores FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "acesso app registros" ON public.registros_dia FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "acesso app feriados" ON public.feriados FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "acesso app salarios" ON public.salarios_funcao FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "acesso app config" ON public.configuracoes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER t_colab_upd BEFORE UPDATE ON public.colaboradores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_reg_upd BEFORE UPDATE ON public.registros_dia FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_sal_upd BEFORE UPDATE ON public.salarios_funcao FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_cfg_upd BEFORE UPDATE ON public.configuracoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.configuracoes (id) VALUES (1);
INSERT INTO public.colaboradores (nome, cpf, funcao) VALUES
('Daniel Nery de Araújo','51912694204','Encarregado'),
('João Carlos Assunção Monteiro','03357087227','Meio oficial de montagem'),
('Jefferson Pereira Monteiro','03297141204','Montador'),
('Diogo de Paula Batista do Nascimento','85332819220','Montador'),
('Daniel Marques de Araújo','62415700215','Encarregado'),
('Alexandre Lima Tavares','70421285217','Ajudante'),
('Mailson Miranda Martins','08042127283','Ajudante de Solda'),
('Victor Prestes Rego','07338227209','Ajudante'),
('João Crisostomo Gomes','20236786253','Manutenção'),
('Alessandro Lima dos Santos','92471978215','Soldador MIG'),
('Edevaldo da Silva Negrão','75068630225','Soldador MIG'),
('Pablo Henrique das Neves','00739285262','Soldador MIG'),
('Renilson Souza Martins','03494695202','Montador'),
('Bismarc da Silva Lima','02483503233','Ajudante'),
('Marcelo Moraes Barbosa','70525480200','Ajudante'),
('Adenilson de Souza Silva','81559334244','Montador'),
('Carlos Douglas Sales Ferreira','70450254277','Ajudante'),
('Glicioney Soares Martins','77171187268','Montador'),
('Alexsandro Silva Santos','06303309239','Ajudante');