import { describe, expect, it } from "vitest";
import { recalcularAjusteSabado, recalcularFechamento } from "@/lib/recalcular-folha";
import { detalhesExtrasFolha } from "@/lib/folha-pdf";
import type { Estado } from "@/lib/nuvem";
import type { Fechamento } from "@/lib/folha-nuvem";

const id = "00000000-0000-4000-8000-000000000001";
const k = `${id}|2026-11-07`;
const estado: Estado = { cols: [], marcas: { [k]: "P" }, horas: {}, pontos: { [k]: { e: 420, s: 1020 } }, jornada: { feriados: [] }, salarios: { porFuncao: {}, divisor: 220, pct50: 50, pct100: 100 } };
const item = { colaborador_id: id, nome: "Ana", funcao: "Montador", salario: 2200, base: 1100, valorHora: 10, pct50: 50, pct100: 100, e50: 9, e100: 0, v50: 135, v100: 0, faltas: 0, total: 1235, extrasDias: [{ data: "2026-11-07", horas: 9, pct: 50, valor: 135 }] };
const folha: Fechamento = { id, data_pagamento: "2026-11-20", periodo_inicio: "2026-11-01", periodo_fim: "2026-11-15", itens: [item], total: 1235, created_at: "2026-11-19T00:00:00Z" };
const ajuste = { data_pagamento: "2026-11-20", colaborador_id: id, colaborador_nome: "Ana", periodo_inicio: "2026-11-07", periodo_fim: "2026-11-07", horas50: 9, horas100: 0, motivo: "Extras anteriores buscadas de 2026-11-01 a 2026-11-15" };

describe("recálculo autorizado da folha com sábado até 12h", () => {
  it("recalcula todos os colaboradores e os detalhes usados no PDF", () => {
    const outro = "00000000-0000-4000-8000-000000000002";
    const dados = { ...estado, marcas: { ...estado.marcas, [`${outro}|2026-11-07`]: "P" as const } };
    const f = recalcularFechamento({ ...folha, itens: [item, { ...item, colaborador_id: outro }] }, dados);
    expect(f.itens.map((i) => i.e50)).toEqual([4, 0]);
    expect(f.total).toBe(2260);
    expect(detalhesExtrasFolha(f.itens[0] ?? item)[0]).toMatchObject({ horas: 4, valor: 60 });
    expect(folha.total).toBe(1235);
  });
  it("preserva salário, base e valor-hora históricos mesmo com salário atual diferente", () => {
    const novo = recalcularFechamento(folha, { ...estado, salarios: { ...estado.salarios, divisor: 110, pct50: 200 } });
    expect(novo.itens[0]).toMatchObject({ salario: 2200, base: 1100, valorHora: 10, pct50: 50, v50: 60, total: 1160 });
  });
  it("recalcula ajustes importados de sábado e elimina extras zeradas", () => {
    expect(recalcularAjusteSabado(ajuste, estado)?.horas50).toBe(4);
    expect(recalcularAjusteSabado(ajuste, { ...estado, pontos: {} })).toBeNull();
  });
  it("preserva ajustes manuais e intervalos sem inventar horários", () => {
    const manual = { ...ajuste, motivo: "Correção manual" };
    expect(recalcularAjusteSabado(manual, estado)).toEqual(manual);
    const intervalo = { ...ajuste, periodo_fim: "2026-11-08" };
    expect(recalcularAjusteSabado(intervalo, estado)).toEqual(intervalo);
  });
  it("não altera registros da frequência e é idempotente", () => {
    const antes = JSON.stringify(estado);
    const f = recalcularFechamento(folha, estado);
    expect(recalcularFechamento(f, estado)).toEqual(f);
    expect(JSON.stringify(estado)).toBe(antes);
  });
});