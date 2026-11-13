import { describe, expect, it } from "vitest";
import { entregaEpiSchema, filtrarEntregasEpi, resumoEntregasEpi, type EntregaEpi } from "../lib/entregas-epi";

const entrega: EntregaEpi = { id: "b7e3e028-7f04-4a15-b2de-af2a6d5ef152", colaborador_id: "48858324-d579-4e55-b65d-b0c61e70b357", colaborador_nome: "Ana", colaborador_funcao: "Soldador", equipamento: "Luvas", quantidade: 2, ca: "", data_entrega: "2026-11-13", responsavel: "", observacoes: "", assinatura_confirmada: false };
describe("controle de entregas de EPI", () => {
  it("rejeita quantidades zero, negativas e fracionadas", () => {
    for (const quantidade of [0, -1, 1.5]) expect(entregaEpiSchema.safeParse({ ...entrega, quantidade }).success).toBe(false);
    expect(entregaEpiSchema.safeParse(entrega).success).toBe(true);
  });
  it("rejeita datas inexistentes e EPI em branco", () => {
    expect(entregaEpiSchema.safeParse({ ...entrega, data_entrega: "2026-02-30" }).success).toBe(false);
    expect(entregaEpiSchema.safeParse({ ...entrega, equipamento: " " }).success).toBe(false);
  });
  it("conta unidades, colaboradores distintos e assinaturas pendentes", () => {
    expect(resumoEntregasEpi([entrega, { ...entrega, id: "outro", quantidade: 3, assinatura_confirmada: true }])).toEqual({ entregas: 2, unidades: 5, colaboradores: 1, pendentes: 1 });
  });
  it("filtra função, período e confirmação sem alterar os registros", () => {
    const rows = [entrega, { ...entrega, id: "outro", assinatura_confirmada: true, data_entrega: "2026-11-12" }];
    expect(filtrarEntregasEpi(rows, { q: "luvas", funcao: "Soldador", inicio: "2026-11-13", fim: "2026-11-13", assinatura: "pendente" })).toEqual([entrega]);
    expect(filtrarEntregasEpi(rows, { funcao: "Ajudante" })).toEqual([]);
    expect(rows).toHaveLength(2);
  });
});