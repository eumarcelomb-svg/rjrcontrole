import { beforeEach, describe, expect, it } from "vitest";
import { carregarRefeicoes, filtrarRefeicoes, gravarRefeicoes, refeicaoSchema, registrarRefeicao, totalRefeicoes } from "../lib/refeicoes";

describe("Controle de refeições", () => {
  beforeEach(() => localStorage.clear());
  it("cobra R$11 por café da manhã individual", () => {
    expect(totalRefeicoes([{ data: "2026-11-21", cafes: 3, almocos: 0 }]).valorCafe).toBe(33);
  });
  it("cobra R$20 por almoço individual", () => {
    expect(totalRefeicoes([{ data: "2026-11-21", cafes: 0, almocos: 4 }]).valorAlmoco).toBe(80);
  });
  it("soma as quantidades manuais sem derivar da frequência", () => {
    expect(totalRefeicoes([{ data: "2026-11-21", cafes: 3, almocos: 4 }]).total).toBe(113);
  });
  it("edita o dia sem duplicar suas quantidades", () => {
    const registros = registrarRefeicao([{ data: "2026-11-21", cafes: 5, almocos: 6 }], { data: "2026-11-21", cafes: 3, almocos: 4 });
    gravarRefeicoes(registros);
    expect(carregarRefeicoes()).toEqual([{ data: "2026-11-21", cafes: 3, almocos: 4 }]);
  });
  it("restringe totais ao intervalo inclusive", () => {
    const registros = [20, 21, 22].map((dia) => ({ data: `2026-11-${dia}`, cafes: 1, almocos: 1 }));
    expect(totalRefeicoes(filtrarRefeicoes(registros, "2026-11-20", "2026-11-21")).total).toBe(62);
  });
  it("rejeita quantidades negativas, fracionadas e datas inexistentes", () => {
    for (const input of [{ data: "2026-11-21", cafes: -1, almocos: 1 }, { data: "2026-11-21", cafes: 1, almocos: 1.5 }, { data: "2026-02-30", cafes: 1, almocos: 1 }]) {
      expect(refeicaoSchema.safeParse(input).success).toBe(false);
    }
  });
});