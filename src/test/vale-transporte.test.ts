import { describe, expect, it } from "vitest";
import { linhasVt, periodoVt, segundaVt } from "../lib/vale-transporte";

const colaboradores = [
  { id: "1", nome: "Zélia", cpf: "12345678901", funcao: "Montador", ativo: true },
  { id: "2", nome: "Ana", cpf: "23456789012", funcao: "Ajudante", ativo: false },
];
describe("vale-transporte semanal", () => {
  it("atribui R$50 por colaborador sem descontar transporte por colega", () => {
    expect(linhasVt(colaboradores, ["1"]).map((c) => c.valor)).toEqual([50, 50]);
  });
  it("usa a segunda-feira da semana como data habitual da entrega", () => {
    expect(segundaVt(new Date(2026, 10, 12))).toBe("2026-11-09");
    expect(segundaVt(new Date(2026, 10, 9))).toBe("2026-11-09");
  });
  it("abrange uma semana completa", () => {
    expect(periodoVt("2026-11-12")).toEqual({ inicio: "2026-11-09", fim: "2026-11-15" });
  });
  it("inclui todos os nomes inclusive inativos em ordem alfabética", () => {
    expect(linhasVt(colaboradores).map((c) => c.nome)).toEqual(["Ana", "Zélia"]);
  });
  it("marca individualmente quem é transportado por colega", () => {
    expect(linhasVt(colaboradores, ["1"]).map((c) => c.transportado)).toEqual([false, true]);
  });
});