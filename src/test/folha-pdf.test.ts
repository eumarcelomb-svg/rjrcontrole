import { describe, expect, it } from "vitest";
import { calcularFolha } from "@/lib/folha";
import { detalhesExtrasFolha, ordenarItensFolha } from "@/lib/folha-pdf";

const id = "00000000-0000-4000-8000-000000000001";
const col = { id, nome: "João", cpf: "", funcao: "Montador", ativo: true, salario: 2200 };
const salarios = { porFuncao: {}, divisor: 220, pct50: 50, pct100: 100 };
const marcas = { [`${id}|2026-11-02`]: "P" as const, [`${id}|2026-11-08`]: "P" as const };
const pontos = { [`${id}|2026-11-02`]: { e: 420, s: 1140 }, [`${id}|2026-11-08`]: { e: 420, s: 600 } };

describe("detalhamento salvo dos PDFs da folha", () => {
  it("guarda dia, horas, percentual e valor das extras para os documentos", () => {
    const item = calcularFolha("2026-11-20", [col], marcas, {}, { feriados: [] }, pontos, salarios).itens[0];
    expect(item?.extrasDias).toEqual([{ data: "2026-11-02", horas: 2, pct: 50, valor: 30 }, { data: "2026-11-08", horas: 3, pct: 100, valor: 60 }]);
  });
  it("não muda os valores salvos quando o salário atual muda", () => {
    const folha = calcularFolha("2026-11-20", [{ ...col }], marcas, {}, { feriados: [] }, pontos, salarios);
    const item = folha.itens[0];
    if (!item) throw new Error("Item não calculado");
    const salarioAlterado = { ...col, salario: 4400 };
    calcularFolha("2026-11-20", [salarioAlterado], marcas, {}, { feriados: [] }, pontos, salarios);
    expect(detalhesExtrasFolha(item).map((e) => e.valor)).toEqual([30, 60]);
    expect(item.total).toBe(1190);
  });
  it("inclui ajustes anteriores sem duplicar extras da frequência", () => {
    const ajuste = { data_pagamento: "2026-11-20", colaborador_id: id, colaborador_nome: col.nome, periodo_inicio: "2026-11-02", periodo_fim: "2026-11-08", horas50: 4, horas100: 1, motivo: "Correção" };
    const item = calcularFolha("2026-11-20", [col], marcas, {}, { feriados: [] }, pontos, salarios, [ajuste]).itens[0];
    if (!item) throw new Error("Item não calculado");
    expect(detalhesExtrasFolha(item).reduce((t, e) => t + e.valor, 0)).toBe(170);
    expect(item.v50 + item.v100).toBe(170);
  });
  it("preserva totais de fechamentos antigos sem inventar datas", () => {
    const item = { colaborador_id: id, nome: col.nome, funcao: col.funcao, salario: 2200, base: 1100, e50: 2, e100: 3, v50: 30, v100: 60, faltas: 0, total: 1190 };
    const detalhes = detalhesExtrasFolha(item);
    expect(detalhes.reduce((t, e) => t + e.horas, 0)).toBe(5);
    expect(detalhes.reduce((t, e) => t + e.valor, 0)).toBe(90);
  });
  it("ordena os colaboradores sem modificar o fechamento", () => {
    const item = calcularFolha("2026-11-20", [col], {}, {}, { feriados: [] }, {}, salarios).itens[0];
    if (!item) throw new Error("Item não calculado");
    const itens = [{ ...item, nome: "Victor" }, { ...item, nome: "Álvaro" }];
    expect(ordenarItensFolha(itens).map((i) => i.nome)).toEqual(["Álvaro", "Victor"]);
    expect(itens[0]?.nome).toBe("Victor");
  });
});