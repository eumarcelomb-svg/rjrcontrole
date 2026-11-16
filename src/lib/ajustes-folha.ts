import { z } from "zod";

const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((v) => {
  const d = new Date(`${v}T12:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v;
}, "Informe uma data válida.");

export const ajusteFolhaSchema = z.object({
  id: z.string().uuid().optional(),
  data_pagamento: data.refine((d) => ["05", "20"].includes(d.slice(-2)), "Pagamento deve ser dia 05 ou 20."),
  colaborador_id: z.string().uuid(),
  colaborador_nome: z.string().trim().min(1),
  periodo_inicio: data,
  periodo_fim: data,
  horas50: z.number().finite().nonnegative(),
  horas100: z.number().finite().nonnegative(),
  motivo: z.string().trim().min(1, "Informe o motivo do ajuste."),
}).superRefine((a, ctx) => {
  if (a.periodo_inicio > a.periodo_fim) ctx.addIssue({ code: "custom", path: ["periodo_fim"], message: "O fim deve ser igual ou posterior ao início." });
  const [ano = 0, mes = 1, dia = 0] = a.data_pagamento.split("-").map(Number);
  const fim = dia === 20 ? `${a.data_pagamento.slice(0, 7)}-15` : new Date(Date.UTC(ano, mes - 1, 0)).toISOString().slice(0, 10);
  if (a.periodo_fim > fim) ctx.addIssue({ code: "custom", path: ["periodo_fim"], message: "As extras devem ser anteriores ou iguais ao fim do período da folha." });
  if (a.horas50 + a.horas100 <= 0) ctx.addIssue({ code: "custom", path: ["horas50"], message: "Informe pelo menos uma hora extra ou fração." });
});
export type AjusteFolha = z.infer<typeof ajusteFolhaSchema>;

/** Aceita horas decimais ou H:MM, sem o limite de 24h de um horário de relógio. */
export function lerHorasExtras(valor: string): number {
  const texto = valor.trim().replace(",", ".");
  if (!texto) return 0;
  if (/^\d+:\d{2}$/.test(texto)) {
    const [h = 0, m = 0] = texto.split(":").map(Number);
    if (m < 60) return h + m / 60;
  } else if (/^\d+(\.\d+)?$/.test(texto)) return Number(texto);
  throw new Error("Informe horas decimais ou H:MM (ex.: 2,5 ou 2:30).");
}