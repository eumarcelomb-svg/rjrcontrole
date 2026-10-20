import { describe, expect, it } from "vitest";
import { calcPonto, extrasDia, horasDia, resumo, SALARIOS_PADRAO } from "@/lib/frequencia";

const segunda = new Date(2026, 9, 12);
const sexta = new Date(2026, 9, 16);
const sabado = new Date(2026, 9, 17);
const domingo = new Date(2026, 9, 18);
const jornada = { feriados: [] };

describe("Horas extras RJR", () => {
  it.each([sabado, domingo])("presença sem horários no fim de semana gera 9 horas extras: %s", (dia) => {
    const key = "c1|dia";
    expect(horasDia(key, dia, { [key]: "P" }, {}, jornada)).toBe(9);
    expect(extrasDia(key, dia, { [key]: "P" }, {}, jornada)).toBe(9);
  });
  it("presença no feriado gera 9 horas extras e nenhuma hora normal", () => {
    const r = resumo("c1", "Montador", [segunda], { "c1|2026-10-12": "P" }, {},
      { feriados: ["2026-10-12"] }, {}, SALARIOS_PADRAO);
    expect(r.normais).toBe(0);
    expect(r.e100).toBe(9);
  });
  it("inclui presenças de sábado e domingo na ficha e no valor a receber", () => {
    const r = resumo("c1", "Montador", [sabado, domingo],
      { "c1|2026-10-17": "P", "c1|2026-10-18": "P" }, {}, jornada, {},
      { ...SALARIOS_PADRAO, porFuncao: { Montador: 2200 } });
    expect(r.normais).toBe(0);
    expect(r.e50).toBe(9);
    expect(r.e100).toBe(9);
    expect(r.total).toBe(315);
  });
  it("mantém as horas manuais e o ponto completo acima da presença padrão de domingo", () => {
    const key = "c1|2026-10-18";
    expect(extrasDia(key, domingo, { [key]: "P" }, { [key]: 5 }, jornada, { [key]: { e: 420 } })).toBe(5);
    expect(extrasDia(key, domingo, { [key]: "P" }, { [key]: 5 }, jornada, { [key]: { e: 420, s: 660 } })).toBe(4);
  });
  it.each(["F", "J"] as const)("não atribui extras à marcação %s no sábado", (status) => {
    expect(extrasDia("c1|dia", sabado, { "c1|dia": status }, {}, jornada)).toBe(0);
  });
  it("desconta uma hora de almoço no expediente 07:00–17:00", () => {
    expect(calcPonto({ e: 420, s: 1020 }, segunda, jornada)).toEqual({ h: 9, e: 0 });
  });
  it("conta o trabalho depois das 17:00 como extra de segunda a quinta", () => {
    expect(calcPonto({ e: 420, s: 1110 }, segunda, jornada)).toEqual({ h: 10.5, e: 1.5 });
  });
  it("encerra o expediente de sexta às 16:00", () => {
    expect(calcPonto({ e: 420, s: 1020 }, sexta, jornada)).toEqual({ h: 9, e: 1 });
  });
  it("aplica a tolerância de 15 minutos na entrada e na saída", () => {
    expect(calcPonto({ e: 405, s: 1005 }, segunda, jornada)).toEqual({ h: 9, e: 0 });
  });
  it("conta entrada às 06:30 como 30 minutos extras", () => {
    expect(calcPonto({ e: 390, s: 1020 }, segunda, jornada)).toEqual({ h: 9.5, e: 0.5 });
  });
  it.each([sabado, domingo, segunda])("desconta almoço das extras em fins de semana e feriados: %s", (dia) => {
    const cfg = { feriados: ["2026-10-12"] };
    expect(calcPonto({ e: 420, s: 1020 }, dia, cfg)).toEqual({ h: 9, e: 9 });
  });
  it("conta como extra um turno curto no sábado, sem descontar almoço", () => {
    expect(calcPonto({ e: 1200, s: 1290 }, sabado, jornada)).toEqual({ h: 1.5, e: 1.5 });
  });
  it("conta como extra um turno curto depois das 17:00 num dia útil", () => {
    expect(calcPonto({ e: 1080, s: 1200 }, segunda, jornada)).toEqual({ h: 2, e: 2 });
  });
  it("usa o total manual enquanto o check-out não foi informado", () => {
    const key = "c1|2026-10-17";
    expect(horasDia(key, sabado, { [key]: "P" }, { [key]: 9 }, jornada, { [key]: { e: 420 } })).toBe(9);
    expect(extrasDia(key, sabado, { [key]: "P" }, { [key]: 9 }, jornada, { [key]: { e: 420 } })).toBe(9);
  });
  it("o ponto completo substitui o total manual e inclui extras no valor a receber", () => {
    const r = resumo("c1", "Montador", [sabado], {}, { "c1|2026-10-17": 12 }, jornada,
      { "c1|2026-10-17": { e: 420, s: 1020 } }, { ...SALARIOS_PADRAO, porFuncao: { Montador: 2200 } });
    expect(r.normais).toBe(0);
    expect(r.e50).toBe(9);
    expect(r.total).toBe(135);
  });
});