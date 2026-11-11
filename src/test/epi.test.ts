import { describe, expect, it } from "vitest";
import { gruposEpi } from "../lib/epi";

describe("ficha coletiva de EPI", () => {
  const colaboradores = [
    { id: "1", nome: "Zélia", cpf: "12345678901", funcao: "Soldador", ativo: true },
    { id: "2", nome: "Ana", cpf: "23456789012", funcao: "Ajudante", ativo: false },
    { id: "3", nome: "André", cpf: "34567890123", funcao: "Soldador", ativo: true },
  ];
  it("inclui todos os colaboradores, inclusive inativos", () => {
    expect(gruposEpi(colaboradores).flatMap((g) => g.nomes).sort()).toEqual(["Ana", "André", "Zélia"]);
  });
  it("separa por função e ordena os nomes de cada grupo", () => {
    expect(gruposEpi(colaboradores)).toEqual([
      { funcao: "Ajudante", nomes: ["Ana"] },
      { funcao: "Soldador", nomes: ["André", "Zélia"] },
    ]);
  });
  it("não fornece CPF nos dados destinados à ficha", () => {
    for (const c of colaboradores) expect(JSON.stringify(gruposEpi(colaboradores))).not.toContain(c.cpf);
  });
});