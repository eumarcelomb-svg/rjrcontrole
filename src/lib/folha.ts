import { addDays, ordenarColaboradores, resumo, type Colaborador, type Horas, type Jornada, type Marcas, type Pontos, type Salarios } from "./frequencia";
import { ajusteFolhaSchema, type AjusteFolha } from "./ajustes-folha";

// Pagamentos quinzenais: dia 20 paga 1–15 do mês; dia 05 paga 16–fim do mês anterior.
// Cada pagamento = 50% do salário + horas extras do próprio período.
export const PERCENTUAL_QUINZENA = 0.5;

const p2 = (n: number) => String(n).padStart(2, "0");
const ymd = (a: number, m: number, d: number) => `${a}-${p2(m)}-${p2(d)}`;

export function periodoPagamento(dataPagamento: string): { inicio: string; fim: string } {
  const [a = 0, m = 0, d = 0] = dataPagamento.split("-").map(Number);
  if (d === 20) return { inicio: ymd(a, m, 1), fim: ymd(a, m, 15) };
  if (d === 5) {
    const pa = m === 1 ? a - 1 : a, pm = m === 1 ? 12 : m - 1;
    return { inicio: ymd(pa, pm, 16), fim: ymd(pa, pm, new Date(pa, pm, 0).getDate()) };
  }
  throw new Error("A data de pagamento deve ser dia 05 ou dia 20.");
}

/** Próximas/últimas datas de pagamento em torno de uma data de referência. */
export function datasPagamento(ref: Date, antes = 4, depois = 2): string[] {
  const out: string[] = [];
  for (let i = -Math.ceil(antes / 2) - 1; i <= Math.ceil(depois / 2) + 1; i++) {
    const dt = new Date(ref.getFullYear(), ref.getMonth() + i, 1);
    out.push(ymd(dt.getFullYear(), dt.getMonth() + 1, 5), ymd(dt.getFullYear(), dt.getMonth() + 1, 20));
  }
  const hoje = ymd(ref.getFullYear(), ref.getMonth() + 1, ref.getDate());
  const idx = out.findIndex((x) => x >= hoje);
  return out.slice(Math.max(0, idx - antes), idx + depois);
}

export function proximoPagamento(ref: Date): string {
  const hoje = ymd(ref.getFullYear(), ref.getMonth() + 1, ref.getDate());
  return datasPagamento(ref, 0, 1)[0] ?? hoje;
}

export type ItemFolha = { colaborador_id: string; nome: string; funcao: string; salario: number; base: number; e50: number; e100: number; v50: number; v100: number; faltas: number; total: number; ajustes?: AjusteFolha[] };

export function calcularFolha(dataPagamento: string, cols: Colaborador[], m: Marcas, h: Horas, j: Jornada, p: Pontos, s: Salarios, ajustes: AjusteFolha[] = []) {
  const { inicio, fim } = periodoPagamento(dataPagamento);
  const dias: Date[] = [];
  const [a = 0, mm = 1, d = 1] = inicio.split("-").map(Number);
  for (let dt = new Date(a, mm - 1, d); ; dt = addDays(dt, 1)) {
    const k = ymd(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
    if (k > fim) break;
    dias.push(dt);
  }
  const ajustesPagamento = ajustes.map((a) => ajusteFolhaSchema.parse(a)).filter((a) => a.data_pagamento === dataPagamento);
  const itens: ItemFolha[] = ordenarColaboradores(cols.filter((c) => c.ativo || ajustesPagamento.some((a) => a.colaborador_id === c.id))).map((c) => {
    const r = resumo(c.id, c.funcao, dias, m, h, j, p, s, c.salario);
    const base = c.ativo ? r.salario * PERCENTUAL_QUINZENA : 0;
    const ajustesColaborador = ajustesPagamento.filter((a) => a.colaborador_id === c.id);
    const e50 = r.e50 + ajustesColaborador.reduce((t, a) => t + a.horas50, 0);
    const e100 = r.e100 + ajustesColaborador.reduce((t, a) => t + a.horas100, 0);
    const v50 = e50 * r.valorHora * (1 + s.pct50 / 100);
    const v100 = e100 * r.valorHora * (1 + s.pct100 / 100);
    return { colaborador_id: c.id, nome: c.nome, funcao: c.funcao, salario: r.salario, base, e50, e100, v50, v100, faltas: r.f, total: base + v50 + v100, ajustes: ajustesColaborador };
  });
  return { inicio, fim, itens, total: itens.reduce((t, i) => t + i.total, 0) };
}
