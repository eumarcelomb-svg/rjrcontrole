import { z } from "zod";
import { ajusteFolhaSchema, type AjusteFolha } from "./ajustes-folha";
import { periodoPagamento } from "./folha";
import { addDays, iso, ordenarColaboradores, resumo, type Colaborador, type Horas, type Jornada, type Marcas, type Pontos, type Salarios } from "./frequencia";

const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((v) => {
  const d = new Date(`${v}T12:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v;
}, "Informe uma data válida.");
export const intervaloExtrasSchema = z.object({ inicio: data, fim: data }).refine((v) => v.inicio <= v.fim, "O fim deve ser igual ou posterior ao início.");
type Fechado = { data_pagamento: string; periodo_inicio: string; periodo_fim: string; itens: { colaborador_id: string; ajustes?: AjusteFolha[] }[] };
export type ResultadoBuscaExtras = ReturnType<typeof buscarExtrasPeriodo>;

/** Cada dia importado vira um ajuste próprio; períodos já contabilizados não são pagos novamente. */
export function buscarExtrasPeriodo(dataPagamento: string, inicio: string, fim: string, cols: Colaborador[], m: Marcas, h: Horas, j: Jornada, p: Pontos, s: Salarios, ajustes: AjusteFolha[], fechamentos: Fechado[]) {
  intervaloExtrasSchema.parse({ inicio, fim });
  const periodo = periodoPagamento(dataPagamento);
  if (fim > periodo.fim) throw new Error("O intervalo deve terminar até o fim do período da folha.");
  const dias: Date[] = [];
  for (let d = new Date(`${inicio}T12:00:00`); iso(d) <= fim; d = addDays(d, 1)) dias.push(d);
  return ordenarColaboradores(cols).flatMap((c) => {
    const r = resumo(c.id, c.funcao, dias, m, h, j, p, s, c.salario);
    const extras = r.extrasDias.map((e) => {
      const dentro = (a: string, b: string) => a <= e.data && e.data <= b;
      const incluidoAtual = c.ativo && dentro(periodo.inicio, periodo.fim);
      const ajustado = ajustes.some((a) => a.colaborador_id === c.id && dentro(a.periodo_inicio, a.periodo_fim));
      const fechado = fechamentos.some((f) => f.itens.some((i) => i.colaborador_id === c.id && (dentro(f.periodo_inicio, f.periodo_fim) || i.ajustes?.some((a) => dentro(a.periodo_inicio, a.periodo_fim)))));
      const bloqueio = incluidoAtual ? "Já incluída nesta folha" : ajustado || fechado ? "Já contabilizada em ajuste ou fechamento" : "";
      const ajuste = ajusteFolhaSchema.parse({ data_pagamento: dataPagamento, colaborador_id: c.id, colaborador_nome: c.nome, periodo_inicio: e.data, periodo_fim: e.data, horas50: e.domingoFeriado ? 0 : e.horas, horas100: e.domingoFeriado ? e.horas : 0, motivo: `Extras anteriores buscadas de ${inicio} a ${fim}` });
      return { ...e, bloqueio, ajuste };
    });
    if (!extras.length) return [];
    const disponiveis = extras.filter((e) => !e.bloqueio);
    return [{ colaborador: c, extras, horas50: disponiveis.reduce((t, e) => t + e.ajuste.horas50, 0), horas100: disponiveis.reduce((t, e) => t + e.ajuste.horas100, 0), ajustes: disponiveis.map((e) => e.ajuste) }];
  });
}