import { describe, expect, it } from "vitest";
import { calcularFolha, periodoPagamento, proximoPagamento } from "@/lib/folha";
import { ajusteFolhaSchema, lerHorasExtras, type AjusteFolha } from "@/lib/ajustes-folha";
describe("folha quinzenal", () => {
  it("dia 20 paga 01 a 15 do mês", () => expect(periodoPagamento("2026-11-20")).toEqual({ inicio: "2026-11-01", fim: "2026-11-15" }));
  it("dia 05 paga 16 ao fim do mês anterior", () => expect(periodoPagamento("2026-12-05")).toEqual({ inicio: "2026-11-16", fim: "2026-11-30" }));
  it("dia 05 de janeiro paga dezembro", () => expect(periodoPagamento("2027-01-05")).toEqual({ inicio: "2026-12-16", fim: "2026-12-31" }));
  it("próximo pagamento após 16/11 é 20/11", () => expect(proximoPagamento(new Date(2026, 10, 16))).toBe("2026-11-20"));
});

const id = "00000000-0000-4000-8000-000000000001";
const cols = [{ id, nome: "Teste", cpf: "", funcao: "Montador", ativo: true, salario: 2200 }];
const salarios = { porFuncao: {}, divisor: 220, pct50: 50, pct100: 100 };
const ajuste = (inicio: string, fim: string, h50: number, h100: number): AjusteFolha => ({ data_pagamento: "2026-11-20", colaborador_id: id, colaborador_nome: "Teste", periodo_inicio: inicio, periodo_fim: fim, horas50: h50, horas100: h100, motivo: "Extras não medidas" });
const ajustes = [ajuste("2026-11-02", "2026-11-08", 10, 3), ajuste("2026-11-09", "2026-11-15", 8, 2)];

describe("correções pontuais de extras na folha", () => {
  it("soma as semanas 02–08/11 e 09–15/11 a 50% e 100% no pagamento de 20/11", () => {
    const folha = calcularFolha("2026-11-20", cols, {}, {}, { feriados: [] }, {}, salarios, ajustes);
    expect(folha.itens[0]).toMatchObject({ base: 1100, e50: 18, e100: 5, v50: 270, v100: 100, total: 1470, ajustes });
    expect(folha.total).toBe(1470);
  });
  it("não repete a correção no pagamento seguinte de 05/12", () => {
    expect(calcularFolha("2026-12-05", cols, {}, {}, { feriados: [] }, {}, salarios, ajustes).total).toBe(1100);
  });
  it("preserva a frequência e adiciona somente as horas complementares", () => {
    const marcas = { [`${id}|2026-11-03`]: "P" as const };
    const pontos = { [`${id}|2026-11-03`]: { e: 420, s: 1140 } };
    const folha = calcularFolha("2026-11-20", cols, marcas, {}, { feriados: [] }, pontos, salarios, ajustes);
    expect(folha.itens[0]?.e50).toBe(20);
    expect(marcas).toEqual({ [`${id}|2026-11-03`]: "P" });
    expect(pontos[`${id}|2026-11-03`]).toEqual({ e: 420, s: 1140 });
  });
  it("substituir as horas de um ajuste recalcula sem acumular o valor anterior", () => {
    const editados = [{ ...ajustes[0], horas50: 4 } as AjusteFolha, ajustes[1] as AjusteFolha];
    expect(calcularFolha("2026-11-20", cols, {}, {}, { feriados: [] }, {}, salarios, editados).itens[0]?.e50).toBe(12);
  });
  it("remover um ajuste remove seu valor da folha", () => {
    expect(calcularFolha("2026-11-20", cols, {}, {}, { feriados: [] }, {}, salarios, ajustes.slice(1)).total).toBe(1260);
  });
  it("permite extras de períodos anteriores ao da folha", () => {
    expect(ajusteFolhaSchema.safeParse(ajuste("2026-10-05", "2026-10-11", 2, 0)).success).toBe(true);
  });
  it("rejeita período posterior ao fechamento", () => {
    expect(ajusteFolhaSchema.safeParse(ajuste("2026-11-16", "2026-11-22", 2, 0)).success).toBe(false);
  });
  it("rejeita horas negativas ou zeradas", () => {
    expect(ajusteFolhaSchema.safeParse(ajuste("2026-11-02", "2026-11-08", -2, 0)).success).toBe(false);
    expect(ajusteFolhaSchema.safeParse(ajuste("2026-11-02", "2026-11-08", 0, 0)).success).toBe(false);
  });
  it("aceita horas acumuladas em H:MM ou decimal", () => {
    expect(lerHorasExtras("32:30")).toBe(32.5);
    expect(lerHorasExtras("2,5")).toBe(2.5);
    expect(() => lerHorasExtras("2:75")).toThrow();
  });
});
