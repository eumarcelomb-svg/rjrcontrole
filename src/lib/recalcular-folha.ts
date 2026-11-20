import { addDays, calcDia, extra100, iso, resumo } from "./frequencia";
import type { AjusteFolha } from "./ajustes-folha";
import type { Fechamento } from "./folha-nuvem";
import type { Estado } from "./nuvem";

/** Revisa apenas ajustes diários importados da frequência; valores manuais não são inferidos. */
export function recalcularAjusteSabado(a: AjusteFolha, estado: Estado): AjusteFolha | null {
  const d = new Date(`${a.periodo_inicio}T12:00:00`);
  if (a.periodo_inicio !== a.periodo_fim || d.getDay() !== 6 || !a.motivo.startsWith("Extras anteriores buscadas de ")) return { ...a };
  const k = `${a.colaborador_id}|${a.periodo_inicio}`;
  if (!(k in estado.marcas) && !(k in estado.horas) && !(k in estado.pontos)) throw new Error(`Registro de ${a.periodo_inicio} indisponível para recalcular o ajuste.`);
  const horas = calcDia(k, d, estado.marcas, estado.horas, estado.jornada, estado.pontos).e;
  if (horas === 0) return null;
  return { ...a, horas50: extra100(d, estado.jornada) ? 0 : horas, horas100: extra100(d, estado.jornada) ? horas : 0 };
}

/** Recalcula um fechamento explicitamente, conservando pessoas, salários, base e taxas salvas. */
export function recalcularFechamento(f: Fechamento, estado: Estado): Fechamento {
  const dias: Date[] = [];
  for (let d = new Date(`${f.periodo_inicio}T12:00:00`); iso(d) <= f.periodo_fim; d = addDays(d, 1)) dias.push(d);
  const itens = f.itens.map((i) => {
    if (i.valorHora === undefined || i.pct50 === undefined || i.pct100 === undefined) throw new Error("Fechamento sem taxas históricas: revisão manual necessária.");
    const salarios = { porFuncao: {}, divisor: 220, pct50: i.pct50, pct100: i.pct100 };
    const r = resumo(i.colaborador_id, i.funcao, dias, estado.marcas, estado.horas, estado.jornada, estado.pontos, salarios, i.salario);
    const ajustes = (i.ajustes ?? []).flatMap((a) => { const novo = recalcularAjusteSabado(a, estado); return novo ? [novo] : []; });
    const e50 = r.e50 + ajustes.reduce((n, a) => n + a.horas50, 0);
    const e100 = r.e100 + ajustes.reduce((n, a) => n + a.horas100, 0);
    const valorHora = i.valorHora;
    const v50 = e50 * valorHora * (1 + i.pct50 / 100);
    const v100 = e100 * valorHora * (1 + i.pct100 / 100);
    const extrasDias = r.extrasDias.map((e) => ({ data: e.data, horas: e.horas, pct: e.pct, valor: e.horas * valorHora * (1 + e.pct / 100) }));
    return { ...i, e50, e100, v50, v100, total: i.base + v50 + v100, extrasDias, ajustes };
  });
  return { ...f, itens, total: itens.reduce((n, i) => n + i.total, 0) };
}