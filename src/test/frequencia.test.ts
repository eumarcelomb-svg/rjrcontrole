import { describe, expect, it } from "vitest";
import { calcPonto, extrasDia, horasDia, jornadaDia, ordenarColaboradores, resumo, SALARIOS_PADRAO } from "@/lib/frequencia";

const segunda = new Date(2026, 9, 12);
const sexta = new Date(2026, 9, 16);
const sabado = new Date(2026, 9, 17);
const domingo = new Date(2026, 9, 18);
const jornada = { feriados: [] };

describe("Horas extras RJR", () => {
  it("ordena colaboradores pelo nome em português sem alterar os dados originais", () => {
    const cols = ["Victor", "João", "Álvaro", "Alessandro"].map((nome, i) => ({ id: String(i), nome, cpf: "", funcao: "Montador", ativo: true }));
    expect(ordenarColaboradores(cols).map((c) => c.nome)).toEqual(["Alessandro", "Álvaro", "João", "Victor"]);
    expect(cols[0]?.nome).toBe("Victor");
  });
  it.each([12, 13, 14, 15])("soma 2h extras de 17h a 19h no dia útil %s na coluna e no resumo", (dia) => {
    const data = new Date(2026, 9, dia);
    const k = `c1|2026-10-${dia}`;
    const pontos = { [k]: { e: 420, s: 1140 } };
    const r = resumo("c1", "Montador", [data], { [k]: "P" }, {}, jornada, pontos, SALARIOS_PADRAO);
    expect(extrasDia(k, data, { [k]: "P" }, {}, jornada, pontos)).toBe(2);
    expect(r.e50 + r.e100).toBe(2);
    expect(r.normais).toBe(9);
  });
  it("mantém sexta até 16h e inclui as horas após 17h no total extra", () => {
    const k = "c1|2026-10-16";
    const r = resumo("c1", "Montador", [sexta], { [k]: "P" }, {}, jornada, { [k]: { e: 420, s: 1140 } }, SALARIOS_PADRAO);
    expect(r.e50).toBe(3);
    expect(r.normais).toBe(8);
  });
  it.each([domingo])("presença sem horários no domingo gera 9 horas extras: %s", (dia) => {
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
    expect(r.normais).toBe(5);
    expect(r.e50).toBe(0);
    expect(r.e100).toBe(9);
    expect(r.total).toBe(230);
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
  it.each([domingo, segunda])("desconta almoço das extras em domingos e feriados: %s", (dia) => {
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
    expect(extrasDia(key, sabado, { [key]: "P" }, { [key]: 9 }, jornada, { [key]: { e: 420 } })).toBe(4);
  });
  it("o ponto completo substitui o total manual e inclui extras no valor a receber", () => {
    const r = resumo("c1", "Montador", [sabado], {}, { "c1|2026-10-17": 12 }, jornada,
      { "c1|2026-10-17": { e: 420, s: 1020 } }, { ...SALARIOS_PADRAO, porFuncao: { Montador: 2200 } });
    expect(r.normais).toBe(5);
    expect(r.e50).toBe(4);
    expect(r.total).toBe(110);
  });
  it("sábado 07:00–12:00 conta cinco horas normais sem extra nem almoço", () => {
    expect(jornadaDia(sabado, jornada)).toBe(5);
    expect(calcPonto({ e: 420, s: 720 }, sabado, jornada)).toEqual({ h: 5, e: 0 });
  });
  it("sábado após 12:00 conta extra de 50% com o dia identificado", () => {
    const k = "c1|2026-10-17";
    const r = resumo("c1", "Montador", [sabado], { [k]: "P" }, {}, jornada, { [k]: { e: 720, s: 840 } }, { ...SALARIOS_PADRAO, porFuncao: { Montador: 2200 } });
    expect(r.normais).toBe(0);
    expect(r.e50).toBe(2);
    expect(r.v50).toBe(30);
    expect(r.extrasDias).toEqual([{ data: "2026-10-17", horas: 2, pct: 50, domingoFeriado: false }]);
  });
  it("sábado 07:00–17:00 desconta almoço das extras e preserva manhã normal", () => {
    expect(calcPonto({ e: 420, s: 1020 }, sabado, jornada)).toEqual({ h: 9, e: 4 });
  });
  it("presença sem horários no sábado presume somente 07:00–12:00", () => {
    expect(horasDia("c1|dia", sabado, { "c1|dia": "P" }, {}, jornada)).toBe(5);
    expect(extrasDia("c1|dia", sabado, { "c1|dia": "P" }, {}, jornada)).toBe(0);
  });
  it("sábado feriado continua integralmente extra de 100%", () => {
    const k = "c1|2026-10-17";
    const r = resumo("c1", "Montador", [sabado], { [k]: "P" }, {}, { feriados: ["2026-10-17"] }, { [k]: { e: 420, s: 720 } }, SALARIOS_PADRAO);
    expect(r.normais).toBe(0);
    expect(r.e100).toBe(5);
    expect(r.e50).toBe(0);
  });
  it("saída parcial de sábado às 14h presume 07h e calcula 1h extra após almoço", () => {
    expect(extrasDia("c1|dia", sabado, { "c1|dia": "P" }, {}, jornada, { "c1|dia": { s: 840 } })).toBe(1);
  });
});
describe("Ponto parcial e identificação das extras", () => {
  it("só a saída às 18:00 na sexta conta 2h extras (expediente até 16:00)", () => {
    const k = "c1|2026-10-16";
    const r = resumo("c1", "Montador", [sexta], { [k]: "P" }, {}, jornada, { [k]: { s: 1080 } }, SALARIOS_PADRAO);
    expect(r.e50).toBe(2);
    expect(r.normais).toBe(8);
  });
  it("só a saída às 19:00 na segunda conta 2h extras a 50%", () => {
    const k = "c1|2026-10-12";
    expect(extrasDia(k, segunda, { [k]: "P" }, {}, jornada, { [k]: { s: 1140 } })).toBe(2);
  });
  it("só a entrada às 06:00 na segunda conta 1h extra", () => {
    const k = "c1|2026-10-12";
    expect(extrasDia(k, segunda, { [k]: "P" }, {}, jornada, { [k]: { e: 360 } })).toBe(1);
  });
  it("lista o dia da extra com 50% na semana e 100% no domingo", () => {
    const ks = "c1|2026-10-12", kd = "c1|2026-10-18";
    const r = resumo("c1", "Montador", [segunda, domingo], { [ks]: "P", [kd]: "P" }, {}, jornada, { [ks]: { e: 420, s: 1140 } }, SALARIOS_PADRAO);
    expect(r.extrasDias).toEqual([
      { data: "2026-10-12", horas: 2, pct: 50, domingoFeriado: false },
      { data: "2026-10-18", horas: 9, pct: 100, domingoFeriado: true },
    ]);
  });
});
