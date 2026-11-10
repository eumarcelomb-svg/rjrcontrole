import { describe, expect, it } from "vitest";
import { criarBackup, lerBackup, contarRegistros } from "@/lib/backup";
import type { Estado } from "@/lib/nuvem";

const id = "b21321cd-395c-4eed-b6bb-b301e6b95104";
const k = `${id}|2026-11-08`;
const estado: Estado = {
  cols: [{ id, nome: "João", cpf: "00000000001", funcao: "Montador", ativo: false }],
  marcas: { [k]: "P" }, horas: { [k]: 9 }, pontos: { [k]: { e: 420 } },
  jornada: { feriados: ["2026-11-02"] },
  salarios: { porFuncao: { Montador: 2200 }, divisor: 220, pct50: 50, pct100: 100 },
};
describe("Backup JSON completo", () => {
  it("restaura colaboradores inativos e registros com ponto parcial sem perder horas manuais", () => {
    expect(lerBackup(criarBackup(estado))).toEqual(estado);
    expect(lerBackup(criarBackup(estado)).horas[k]).toBe(9);
  });
  it("inclui salários e feriados no backup completo", () => {
    const d = lerBackup(criarBackup(estado));
    expect(d.salarios.porFuncao.Montador).toBe(2200);
    expect(d.jornada.feriados).toEqual(["2026-11-02"]);
  });
  it("conta um registro por dia mesmo com presença, horas e ponto", () => {
    expect(contarRegistros(estado)).toBe(1);
  });
  it("rejeita formato ou versão incompatível", () => {
    const b = JSON.parse(criarBackup(estado)); b.versao = 2;
    expect(() => lerBackup(JSON.stringify(b))).toThrow();
    expect(() => lerBackup("{}")).toThrow();
  });
  it("rejeita registros de colaborador inexistente", () => {
    expect(() => criarBackup({ ...estado, cols: [] })).toThrow();
  });
  it("rejeita datas inexistentes e horários fora do dia", () => {
    expect(() => criarBackup({ ...estado, jornada: { feriados: ["2026-02-30"] } })).toThrow();
    expect(() => criarBackup({ ...estado, pontos: { [k]: { e: 1440 } } })).toThrow();
  });
  it("rejeita colaboradores duplicados", () => {
    expect(() => criarBackup({ ...estado, cols: [...estado.cols, ...estado.cols] })).toThrow();
  });
});