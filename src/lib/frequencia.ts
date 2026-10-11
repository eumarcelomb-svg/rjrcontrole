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
