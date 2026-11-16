import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { entregaEpiSchema, type EntregaEpi, type ColaboradorEpi } from "./entregas-epi";

// Same browser connection the attendance sheet uses (no-login RLS), so the EPI
// page does not depend on a separate server hop that can fail on its own.
const CAMPOS = "id,colaborador_id,colaborador_nome,colaborador_funcao,equipamento,quantidade,ca,data_entrega,responsavel,observacoes,assinatura_confirmada";

export async function listarControleEpi(): Promise<{ entregas: EntregaEpi[]; colaboradores: ColaboradorEpi[] }> {
  const entregas: EntregaEpi[] = [];
  const colaboradores: ColaboradorEpi[] = [];
  await Promise.all([
    (async () => {
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase.from("entregas_epi").select(CAMPOS).order("data_entrega", { ascending: false }).order("id").range(offset, offset + 499);
        if (error) throw new Error("Não foi possível carregar as entregas de EPI.");
        entregas.push(...(data ?? []));
        if (!data || data.length < 500) break;
      }
    })(),
    (async () => {
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase.from("colaboradores").select("id,nome,funcao,ativo").order("id").range(offset, offset + 499);
        if (error) throw new Error("Não foi possível carregar os colaboradores.");
        colaboradores.push(...(data ?? []));
        if (!data || data.length < 500) break;
      }
    })(),
  ]);
  return { entregas, colaboradores };
}

export async function salvarEntregaEpi({ data: input }: { data: unknown }) {
  const data = entregaEpiSchema.parse(input);
  const { id, ...campos } = data;
  const { data: colaborador, error } = await supabase.from("colaboradores").select("nome,funcao").eq("id", data.colaborador_id).single();
  if (error || !colaborador) throw new Error("Colaborador não encontrado. Recarregue a página.");
  if (id) {
    const { data: anterior, error: erroAnterior } = await supabase.from("entregas_epi").select("colaborador_id,colaborador_nome,colaborador_funcao").eq("id", id).single();
    if (erroAnterior || !anterior) throw new Error("Entrega não encontrada. Recarregue a página.");
    const identidade = anterior.colaborador_id === data.colaborador_id ? { colaborador_nome: anterior.colaborador_nome, colaborador_funcao: anterior.colaborador_funcao } : { colaborador_nome: colaborador.nome, colaborador_funcao: colaborador.funcao };
    const { data: row, error: erroSalvar } = await supabase.from("entregas_epi").update({ ...campos, ...identidade }).eq("id", id).select("*").single();
    if (erroSalvar) throw new Error("Não foi possível salvar a entrega.");
    return row;
  }
  const { data: row, error: erroSalvar } = await supabase.from("entregas_epi").insert({ ...campos, colaborador_nome: colaborador.nome, colaborador_funcao: colaborador.funcao }).select("*").single();
  if (erroSalvar) throw new Error("Não foi possível registrar a entrega.");
  return row;
}

export async function excluirEntregaEpi({ data: input }: { data: unknown }) {
  const id = z.string().uuid().parse(input);
  const { data: removido, error } = await supabase.from("entregas_epi").delete().eq("id", id).select("id").single();
  if (error || !removido) throw new Error("Não foi possível excluir a entrega.");
  return { id: removido.id };
}
