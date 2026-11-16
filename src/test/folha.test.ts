import { describe, expect, it } from "vitest";
import { periodoPagamento, proximoPagamento } from "@/lib/folha";
describe("folha quinzenal", () => {
  it("dia 20 paga 01 a 15 do mês", () => expect(periodoPagamento("2026-11-20")).toEqual({ inicio: "2026-11-01", fim: "2026-11-15" }));
  it("dia 05 paga 16 ao fim do mês anterior", () => expect(periodoPagamento("2026-12-05")).toEqual({ inicio: "2026-11-16", fim: "2026-11-30" }));
  it("dia 05 de janeiro paga dezembro", () => expect(periodoPagamento("2027-01-05")).toEqual({ inicio: "2026-12-16", fim: "2026-12-31" }));
  it("próximo pagamento após 16/11 é 20/11", () => expect(proximoPagamento(new Date(2026, 10, 16))).toBe("2026-11-20"));
});
