CREATE OR REPLACE FUNCTION public.aplicar_recalculo_sabados_rjr(folhas jsonb, ajustes jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE x jsonb; atual jsonb; n integer;
BEGIN
 IF jsonb_typeof(folhas) IS DISTINCT FROM 'array' OR jsonb_typeof(ajustes) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Recálculo inválido'; END IF;
 FOR x IN SELECT value FROM jsonb_array_elements(folhas) ORDER BY value->>'id' LOOP
  SELECT jsonb_build_object('itens', f.itens, 'total', f.total) INTO atual FROM public.fechamentos_folha f WHERE f.id = (x->>'id')::uuid FOR UPDATE;
  IF atual IS NULL OR atual IS DISTINCT FROM x->'antes' THEN RAISE EXCEPTION 'A folha mudou durante a revisão. Recarregue antes de recalcular.'; END IF;
  IF jsonb_typeof(x->'depois'->'itens') IS DISTINCT FROM 'array' OR (x->'depois'->>'total')::numeric < 0 THEN RAISE EXCEPTION 'Folha recalculada inválida'; END IF;
  UPDATE public.fechamentos_folha SET itens = x->'depois'->'itens', total = (x->'depois'->>'total')::numeric WHERE id = (x->>'id')::uuid;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Folha indisponível'; END IF;
 END LOOP;
 FOR x IN SELECT value FROM jsonb_array_elements(ajustes) ORDER BY value->>'id' LOOP
  SELECT jsonb_build_object('horas50', a.horas50, 'horas100', a.horas100) INTO atual FROM public.ajustes_extras_folha a WHERE a.id = (x->>'id')::uuid FOR UPDATE;
  IF atual IS NULL OR atual IS DISTINCT FROM x->'antes' THEN RAISE EXCEPTION 'O ajuste mudou durante a revisão. Recarregue antes de recalcular.'; END IF;
  IF (x->'depois'->>'horas50')::numeric < 0 OR (x->'depois'->>'horas100')::numeric < 0 THEN RAISE EXCEPTION 'Horas recalculadas inválidas'; END IF;
  IF (x->'depois'->>'horas50')::numeric + (x->'depois'->>'horas100')::numeric = 0 THEN
   DELETE FROM public.ajustes_extras_folha WHERE id = (x->>'id')::uuid;
  ELSE
   UPDATE public.ajustes_extras_folha SET horas50 = (x->'depois'->>'horas50')::numeric, horas100 = (x->'depois'->>'horas100')::numeric WHERE id = (x->>'id')::uuid;
  END IF;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Ajuste indisponível'; END IF;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.aplicar_recalculo_sabados_rjr(jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aplicar_recalculo_sabados_rjr(jsonb, jsonb) TO anon, authenticated, service_role;