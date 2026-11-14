import { z } from "zod";

const dataValida = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((v) => {
  const d = new Date(`${v}T12:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v;
}, "Informe uma data válida.");

export const entregaEpiSchema = z.object({
  id: z.string().uuid().optional(),
  colaborador_id: z.string().uuid(),
  equipamento: z.string().trim().min(1, "Informe o EPI.").max(200),
  quantidade: z.number().int().positive("A quantidade deve ser um número inteiro maior que zero."),
  ca: z.string().trim().max(80),
  data_entrega: dataValida,
  responsavel: z.string().trim().max(200),
  observacoes: z.string().trim().max(2000),
  assinatura_confirmada: z.boolean(),
});
export type DadosEntregaEpi = z.infer<typeof entregaEpiSchema>;
export interface EntregaEpi extends DadosEntregaEpi {
  id: string;
  colaborador_nome: string;
  colaborador_funcao: string;
}
export interface ColaboradorEpi { id: string; nome: string; funcao: string; ativo: boolean }

export function resumoEntregasEpi(entregas: EntregaEpi[]) {
  return {
    entregas: entregas.length,
    unidades: entregas.reduce((s, e) => s + e.quantidade, 0),
    colaboradores: new Set(entregas.map((e) => e.colaborador_id)).size,
    pendentes: entregas.filter((e) => !e.assinatura_confirmada).length,
  };
}

export function filtrarEntregasEpi(entregas: EntregaEpi[], filtros: { q?: string | undefined; funcao?: string | undefined; assinatura?: string | undefined; inicio?: string | undefined; fim?: string | undefined }) {
  const q = (filtros.q ?? "").trim().toLocaleLowerCase("pt-BR");
  return entregas.filter((e) =>
    (!q || [e.colaborador_nome, e.equipamento, e.ca, e.responsavel].some((v) => v.toLocaleLowerCase("pt-BR").includes(q))) &&
    (!filtros.funcao || e.colaborador_funcao === filtros.funcao) &&
    (!filtros.assinatura || e.assinatura_confirmada === (filtros.assinatura === "confirmada")) &&
    (!filtros.inicio || e.data_entrega >= filtros.inicio) && (!filtros.fim || e.data_entrega <= filtros.fim)
  );
}