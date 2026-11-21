import { z } from "zod";

export const PRECO_CAFE = 11;
export const PRECO_ALMOCO = 20;
const dataSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Informe uma data válida.");
export const refeicaoSchema = z.object({
  data: dataSchema,
  cafes: z.number().int().min(0).max(100000),
  almocos: z.number().int().min(0).max(100000),
});
export type Refeicao = z.infer<typeof refeicaoSchema>;
const arquivoSchema = z.object({ versao: z.literal(1), registros: z.array(refeicaoSchema) });
const KEY = "rjr-controle-refeicoes-v1";

export function carregarRefeicoes(): Refeicao[] {
  const raw = localStorage.getItem(KEY);
  if (raw === null) return [];
  return arquivoSchema.parse(JSON.parse(raw)).registros;
}

export function gravarRefeicoes(registros: Refeicao[]) {
  const arquivo = arquivoSchema.parse({ versao: 1, registros });
  localStorage.setItem(KEY, JSON.stringify(arquivo));
}

export function registrarRefeicao(registros: Refeicao[], input: unknown): Refeicao[] {
  const registro = refeicaoSchema.parse(input);
  return [...registros.filter((r) => r.data !== registro.data), registro].sort((a, b) => b.data.localeCompare(a.data));
}

export function filtrarRefeicoes(registros: Refeicao[], inicio: string, fim: string) {
  return registros.filter((r) => (!inicio || r.data >= inicio) && (!fim || r.data <= fim)).sort((a, b) => b.data.localeCompare(a.data));
}

export function totalRefeicoes(registros: Refeicao[]) {
  const cafes = registros.reduce((s, r) => s + r.cafes, 0);
  const almocos = registros.reduce((s, r) => s + r.almocos, 0);
  const valorCafe = cafes * PRECO_CAFE;
  const valorAlmoco = almocos * PRECO_ALMOCO;
  return { cafes, almocos, valorCafe, valorAlmoco, total: valorCafe + valorAlmoco };
}