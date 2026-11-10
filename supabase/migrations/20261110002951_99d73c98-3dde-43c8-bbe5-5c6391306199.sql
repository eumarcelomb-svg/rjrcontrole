CREATE OR REPLACE FUNCTION public.restaurar_backup_rjr(backup jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
 IF jsonb_typeof(backup->'colaboradores') IS DISTINCT FROM 'array' OR jsonb_typeof(backup->'registros') IS DISTINCT FROM 'array' OR jsonb_typeof(backup->'feriados') IS DISTINCT FROM 'array' OR jsonb_typeof(backup->'salarios') IS DISTINCT FROM 'array' OR jsonb_typeof(backup->'configuracoes') IS DISTINCT FROM 'object' THEN
  RAISE EXCEPTION 'Backup inválido';
 END IF;
 DELETE FROM public.registros_dia WHERE id IS NOT NULL;
 DELETE FROM public.colaboradores WHERE id IS NOT NULL;
 DELETE FROM public.feriados WHERE data IS NOT NULL;
 DELETE FROM public.salarios_funcao WHERE funcao IS NOT NULL;
 INSERT INTO public.colaboradores(id,nome,cpf,funcao,ativo) SELECT id,nome,cpf,funcao,ativo FROM jsonb_to_recordset(backup->'colaboradores') AS x(id uuid,nome text,cpf text,funcao text,ativo boolean);
 INSERT INTO public.registros_dia(colaborador_id,data,status,horas_manuais,entrada_min,saida_min) SELECT colaborador_id,data,status,horas_manuais,entrada_min,saida_min FROM jsonb_to_recordset(backup->'registros') AS x(colaborador_id uuid,data date,status text,horas_manuais numeric,entrada_min integer,saida_min integer);
 INSERT INTO public.feriados(data) SELECT value::date FROM jsonb_array_elements_text(backup->'feriados');
 INSERT INTO public.salarios_funcao(funcao,salario) SELECT funcao,salario FROM jsonb_to_recordset(backup->'salarios') AS x(funcao text,salario numeric);
 INSERT INTO public.configuracoes(id,divisor,pct50,pct100) VALUES(1,(backup->'configuracoes'->>'divisor')::numeric,(backup->'configuracoes'->>'pct50')::numeric,(backup->'configuracoes'->>'pct100')::numeric) ON CONFLICT(id) DO UPDATE SET divisor=excluded.divisor,pct50=excluded.pct50,pct100=excluded.pct100;
END $$;
REVOKE ALL ON FUNCTION public.restaurar_backup_rjr(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restaurar_backup_rjr(jsonb) TO anon, authenticated, service_role;