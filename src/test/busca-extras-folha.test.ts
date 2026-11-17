import { describe, expect, it } from "vitest";
import { buscarExtrasPeriodo, intervaloExtrasSchema } from "@/lib/busca-extras-folha";
import { calcularFolha } from "@/lib/folha";
import type { AjusteFolha } from "@/lib/ajustes-folha";
const id = "00000000-0000-4000-8000-000000000001";
const outro = "00000000-0000-4000-8000-000000000002";
const cols = [{ id: outro, nome: "Zélia", cpf: "", funcao: "Montador", ativo: false }, { id, nome: "Ana", cpf: "", funcao: "Montador", ativo: true }];
const salarios = { porFuncao: { Montador: 2200 }, divisor: 220, pct50: 50, pct100: 100 };
const marcas = { [`${id}|2026-11-02`]: "P" as const, [`${outro}|2026-11-08`]: "P" as const };
const pontos = { [`${id}|2026-11-02`]: { e: 420, s: 1140 } };
const busca = (pagamento = "2026-12-05", ajustes: AjusteFolha[] = [], fechamentos: Parameters<typeof buscarExtrasPeriodo>[10] = []) => buscarExtrasPeriodo(pagamento, "2026-11-02", "2026-11-08", cols, marcas, {}, { feriados: [] }, pontos, salarios, ajustes, fechamentos);

describe("busca coletiva de extras anteriores", () => {
  it("busca todos no intervalo, ordena nomes e separa 50% e 100%, incluindo desligados", () => {
    const r = busca();
    expect(r.map((x) => x.colaborador.nome)).toEqual(["Ana", "Zélia"]);
    expect(r[0]).toMatchObject({ horas50: 2, horas100: 0 });
    expect(r[1]).toMatchObject({ horas50: 0, horas100: 9 });
    expect(cols[0]?.nome).toBe("Zélia");
  });
  it("adiciona todos os ajustes apenas ao pagamento escolhido", () => {
    const ajustes = busca().flatMap((r) => r.ajustes);
    const f = calcularFolha("2026-12-05", cols, marcas, {}, { feriados: [] }, pontos, salarios, ajustes);
    expect(f.total).toBe(1310);
    expect(f.itens[0]?.e50).toBe(2);
    expect(f.itens[1]?.e100).toBe(9);
    expect(calcularFolha("2026-12-20", cols, marcas, {}, { feriados: [] }, pontos, salarios, ajustes).total).toBe(1100);
  });
  it("não duplica extras já calculadas no próprio período da folha", () => {
    const r = busca("2026-11-20");
    expect(r[0]?.ajustes).toEqual([]);
    expect(r[0]?.extras[0]?.bloqueio).toBe("Já incluída nesta folha");
  });
  it("não repete ajustes existentes, mesmo com intervalos de busca sobrepostos", () => {
    const ajustes = busca().flatMap((r) => r.ajustes);
    expect(busca("2026-12-05", ajustes).flatMap((r) => r.ajustes)).toEqual([]);
    expect(busca("2026-12-20", ajustes).flatMap((r) => r.ajustes)).toEqual([]);
  });
  it("não adiciona extras cobertas por um fechamento salvo", () => {
    const r = busca("2026-12-05", [], [{ data_pagamento: "2026-11-20", periodo_inicio: "2026-11-01", periodo_fim: "2026-11-15", itens: cols.map((c) => ({ colaborador_id: c.id })) }]);
    expect(r.flatMap((r) => r.ajustes)).toEqual([]);
  });
  it("trata feriado como 100% e não busca dias fora do intervalo", () => {
    const r = buscarExtrasPeriodo("2026-12-05", "2026-11-02", "2026-11-02", cols, marcas, {}, { feriados: ["2026-11-02"] }, pontos, salarios, [], []);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ horas50: 0, horas100: 11 });
  });
  it("rejeita intervalos inválidos e posteriores ao fim da folha", () => {
    expect(intervaloExtrasSchema.safeParse({ inicio: "2026-02-30", fim: "2026-03-01" }).success).toBe(false);
    expect(intervaloExtrasSchema.safeParse({ inicio: "2026-11-08", fim: "2026-11-02" }).success).toBe(false);
    expect(() => busca("2026-11-05")).toThrow("fim do período");
  });
});