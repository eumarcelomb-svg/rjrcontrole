import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { entregaEpiSchema, type EntregaEpi, type ColaboradorEpi } from "./entregas-epi";

export const listarControleEpi = createServerFn({ method: "GET" }).handler(async () => {
  const { clienteEpi } = await import("./entregas-epi-store.server");
  const db = clienteEpi();
  const entregas: EntregaEpi[] = [];
  const colaboradores: ColaboradorEpi[] = [];
  await Promise.all([
    (async () => {
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await db.from("entregas_epi").select("id,colaborador_id,colaborador_nome,colaborador_funcao,equipamento,quantidade,ca,data_entrega,responsavel,observacoes,assinatura_confirmada").order("data_entrega", { ascending: false }).order("id").range(offset, offset + 499);
        if (error) throw new Error("Não foi possível carregar as entregas de EPI.");
        entregas.push(...(data ?? []));
        if (!data || data.length < 500) break;
      }
    })(),
    (async () => {
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await db.from("colaboradores").select("id,nome,funcao,ativo").order("id").range(offset, offset + 499);
        if (error) throw new Error("Não foi possível carregar os colaboradores.");
        colaboradores.push(...(data ?? []));
        if (!data || data.length < 500) break;
      }
    })(),
  ]);
  return { entregas, colaboradores };
});

export const salvarEntregaEpi = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => entregaEpiSchema.parse(input))
  .handler(async ({ data }) => {
    const { clienteEpi } = await import("./entregas-epi-store.server");
    const db = clienteEpi();
    const { id, ...campos } = data;
    const { data: colaborador, error } = await db.from("colaboradores").select("nome,funcao").eq("id", data.colaborador_id).single();
    if (error || !colaborador) throw new Error("Colaborador não encontrado. Recarregue a página.");
    if (data.id) {
      const { data: anterior, error: erroAnterior } = await db.from("entregas_epi").select("colaborador_id,colaborador_nome,colaborador_funcao").eq("id", data.id).single();
      if (erroAnterior || !anterior) throw new Error("Entrega não encontrada. Recarregue a página.");
      const identidade = anterior.colaborador_id === data.colaborador_id ? { colaborador_nome: anterior.colaborador_nome, colaborador_funcao: anterior.colaborador_funcao } : { colaborador_nome: colaborador.nome, colaborador_funcao: colaborador.funcao };
      const { data: row, error: erroSalvar } = await db.from("entregas_epi").update({ ...campos, ...identidade }).eq("id", data.id).select("*").single();
      if (erroSalvar) throw new Error("Não foi possível salvar a entrega.");
      return row;
    }
    const { data: row, error: erroSalvar } = await db.from("entregas_epi").insert({ ...campos, colaborador_nome: colaborador.nome, colaborador_funcao: colaborador.funcao }).select("*").single();
    if (erroSalvar) throw new Error("Não foi possível registrar a entrega.");
    return row;
  });

export const excluirEntregaEpi = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.string().uuid().parse(input))
  .handler(async ({ data }) => {
    const { clienteEpi } = await import("./entregas-epi-store.server");
    const { data: removido, error } = await clienteEpi().from("entregas_epi").delete().eq("id", data).select("id").single();
    if (error || !removido) throw new Error("Não foi possível excluir a entrega.");
    return { id: removido.id };
  });