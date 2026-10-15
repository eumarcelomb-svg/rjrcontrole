export type Status = "P" | "F" | "J";
export interface Colaborador {
  id: string;
  nome: string;
  cpf: string;
  funcao: string;
  ativo: boolean;
}
export type Marcas = Record<string, Status>; // `${id}|${yyyy-mm-dd}`

const SEED: [string, string, string][] = [
  ["Daniel Nery de Araújo", "51912694204", "Encarregado"],
  ["João Carlos Assunção Monteiro", "3357087227", "Meio oficial de montagem"],
  ["Jefferson Pereira Monteiro", "3297141204", "Montador"],
  ["Diogo de Paula Batista do Nascimento", "85332819220", "Montador"],
  ["Daniel Marques de Araújo", "62415700215", "Encarregado"],
  ["Alexandre Lima Tavares", "70421285217", "Ajudante"],
  ["Mailson Miranda Martins", "8042127283", "Ajudante de Solda"],
  ["Victor Prestes Rego", "7338227209", "Ajudante"],
  ["João Crisostomo Gomes", "20236786253", "Manutenção"],
  ["Alessandro Lima dos Santos", "92471978215", "Soldador MIG"],
  ["Edevaldo da Silva Negrão", "75068630225", "Soldador MIG"],
  ["Pablo Henrique das Neves", "739285262", "Soldador MIG"],
  ["Renilson Souza Martins", "3494695202", "Montador"],
  ["Bismarc da Silva Lima", "2483503233", "Ajudante"],
  ["Marcelo Moraes Barbosa", "70525480200", "Ajudante"],
  ["Adenilson de Souza Silva", "81559334244", "Montador"],
  ["Carlos Douglas Sales Ferreira", "70450254277", "Ajudante"],
  ["Glicioney Soares Martins", "77171187268", "Montador"],
  ["Alexsandro Silva Santos", "6303309239", "Ajudante"],
];
// Marks from the PDF (Seg..Sex)
const SEED_MARKS: string[] = [
  " PPPP", " PPPP", " PPFP", " PPPP", " PPPP", " PPPP", " PPPP", " PPPP", " PPPP", " PPPP",
  " PPPP", " PPPP", " PPPP", " PPPP", " PPPP", " PPPP", "  PPF", " PPPP", "    P",
];

export const onlyDigits = (s: string) => s.replace(/\D/g, "");
export const padCpf = (s: string) => onlyDigits(s).padStart(11, "0").slice(-11);
export const fmtCpf = (s: string) => {
  const d = padCpf(s);
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};

export const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const mondayOf = (d: Date) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const wd = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - wd);
  return x;
};
export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

const KEY_C = "rjr-freq-colaboradores";
const KEY_M = "rjr-freq-marcas";

export function loadData(): { colaboradores: Colaboradores; marcas: Marcas } {
  const c = localStorage.getItem(KEY_C);
  const m = localStorage.getItem(KEY_M);
  if (c) return { colaboradores: JSON.parse(c), marcas: m ? JSON.parse(m) : {} };
  const colaboradores = SEED.map(([nome, cpf, funcao], i) => ({
    id: `c${i + 1}`,
    nome,
    cpf: padCpf(cpf),
    funcao,
    ativo: true,
  }));
  const marcas: Marcas = {};
  const mon = mondayOf(new Date());
  colaboradores.forEach((col, i) => {
    (SEED_MARKS[i] ?? "").split("").forEach((ch, d) => {
      if (ch === "P" || ch === "F") marcas[`${col.id}|${iso(addDays(mon, d))}`] = ch;
    });
  });
  return { colaboradores, marcas };
}
type Colaboradores = Colaborador[];

export function saveData(colaboradores: Colaborador[], marcas: Marcas) {
  localStorage.setItem(KEY_C, JSON.stringify(colaboradores));
  localStorage.setItem(KEY_M, JSON.stringify(marcas));
}

export type Horas = Record<string, number>; // horas trabalhadas informadas manualmente
export interface Jornada { feriados: string[] }
export const JORNADA_PADRAO: Jornada = { feriados: [] };
export interface Ponto { e?: number; s?: number } // minutos desde 00:00
export type Pontos = Record<string, Ponto>;
const KEY_H = "rjr-freq-horas";
const KEY_J = "rjr-freq-jornada";
const KEY_P = "rjr-freq-pontos";
export const loadHoras = (): Horas => JSON.parse(localStorage.getItem(KEY_H) ?? "{}");
export const loadPontos = (): Pontos => JSON.parse(localStorage.getItem(KEY_P) ?? "{}");
export const loadJornada = (): Jornada => {
  const j = JSON.parse(localStorage.getItem(KEY_J) ?? "{}");
  return { feriados: Array.isArray(j.feriados) ? j.feriados : [] };
};
export const saveExtras = (h: Horas, j: Jornada, p: Pontos) => {
  localStorage.setItem(KEY_H, JSON.stringify(h));
  localStorage.setItem(KEY_J, JSON.stringify(j));
  localStorage.setItem(KEY_P, JSON.stringify(p));
};
export const INICIO = 7 * 60;
export const TOLERANCIA = 15;
export const ehFeriado = (d: Date, j: Jornada) => j.feriados.includes(iso(d));
/** Fim do expediente (min) ou null quando o dia todo é hora extra (sáb, dom, feriado). */
export const fimDia = (d: Date, j: Jornada): number | null => {
  const w = d.getDay();
  if (w === 0 || w === 6 || ehFeriado(d, j)) return null;
  return w === 5 ? 16 * 60 : 17 * 60;
};
export const jornadaDia = (d: Date, j: Jornada) => { const f = fimDia(d, j); return f === null ? 0 : (f - INICIO) / 60; };
/** Calcula horas e extras a partir do ponto, aplicando tolerância de 15 min antes da entrada e da saída. */
export const calcPonto = (p: Ponto | undefined, d: Date, j: Jornada): { h: number; e: number } | null => {
  if (!p || p.e === undefined || p.s === undefined || p.s <= p.e) return null;
  const fim = fimDia(d, j);
  if (fim === null) { const h = (p.s - p.e) / 60; return { h, e: h }; }
  const e = p.e >= INICIO - TOLERANCIA && p.e <= INICIO ? INICIO : p.e;
  const s = p.s >= fim - TOLERANCIA && p.s <= fim ? fim : p.s;
  const extra = Math.max(0, Math.min(INICIO, s) - e) + Math.max(0, s - Math.max(fim, e));
  return { h: Math.max(0, s - e) / 60, e: extra / 60 };
};
/** Horas no dia: ponto completo > valor informado > P = jornada do dia. */
export const horasDia = (k: string, d: Date, m: Marcas, h: Horas, j: Jornada, p: Pontos = {}) =>
  calcPonto(p[k], d, j)?.h ?? h[k] ?? (m[k] === "P" ? jornadaDia(d, j) : 0);
export const extrasDia = (k: string, d: Date, m: Marcas, h: Horas, j: Jornada, p: Pontos = {}) => {
  const c = calcPonto(p[k], d, j);
  if (c) return c.e;
  return m[k] === "P" || h[k] !== undefined ? Math.max(0, horasDia(k, d, m, h, j) - jornadaDia(d, j)) : 0;
};
export const fmtH = (n: number) => {
  const t = Math.round(n * 60);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};
