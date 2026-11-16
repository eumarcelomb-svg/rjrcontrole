import { supabase } from "@/integrations/supabase/client";
import type { ItemFolha } from "./folha";

export type Fechamento = { id: string; data_pagamento: string; periodo_inicio: string; periodo_fim: string; itens: ItemFolha[]; total: number; created_at: string };

export async function listarFechamentos(): Promise<Fechamento[]> {
  const out: Fechamento[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from("fechamentos_folha").select("*").order("data_pagamento", { ascending: false }).range(offset, offset + 499);
    if (error) throw new Error("Não foi possível carregar os fechamentos.");
    out.push(...((data ?? []) as unknown as Fechamento[]));
    if (!data || data.length < 500) break;
  }
  return out;
}

export async function salvarFechamento(f: { data_pagamento: string; periodo_inicio: string; periodo_fim: string; itens: ItemFolha[]; total: number }) {
  const { error } = await supabase.from("fechamentos_folha").upsert({ ...f, itens: f.itens as never }, { onConflict: "data_pagamento" });
  if (error) throw new Error("Não foi possível salvar o fechamento.");
}

export async function excluirFechamento(id: string) {
  const { error } = await supabase.from("fechamentos_folha").delete().eq("id", id);
  if (error) throw new Error("Não foi possível excluir o fechamento.");
}
