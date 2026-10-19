import { supabase } from "@/integrations/supabase/client";
import {
  loadData, loadHoras, loadJornada, loadPontos, loadSalarios, padCpf, SALARIOS_PADRAO,
  type Colaborador, type Horas, type Jornada, type Marcas, type Pontos, type Salarios, type Status,
} from "./frequencia";

export interface Estado { cols: Colaborador[]; marcas: Marcas; horas: Horas; pontos: Pontos; jornada: Jornada; salarios: Salarios }
type Reg = { colaborador_id: string; data: string; status: Status | null; horas_manuais: number | null; entrada_min: number | null; saida_min: number | null };

const KEY_MIG = "rjr-freq-migrado-nuvem";
const ok = <T,>(r: { data: T; error: unknown }): NonNullable<T> => { if (r.error) throw r.error; return r.data as NonNullable<T>; };

/** Converte o estado da planilha em linhas da tabela registros_dia. */
export function paraRegistros(e: Pick<Estado, "marcas" | "horas" | "pontos">): Map<string, Reg> {
  const out = new Map<string, Reg>();
  const keys = new Set([...Object.keys(e.marcas), ...Object.keys(e.horas), ...Object.keys(e.pontos)]);
  for (const k of keys) {
    const [colaborador_id, data] = k.split("|");
    if (!colaborador_id || !data) continue;
    const p = e.pontos[k];
    const r: Reg = { colaborador_id, data, status: e.marcas[k] ?? null, horas_manuais: e.horas[k] ?? null, entrada_min: p?.e ?? null, saida_min: p?.s ?? null };
    if (r.status || r.horas_manuais !== null || r.entrada_min !== null || r.saida_min !== null) out.set(k, r);
  }
  return out;
}

async function lerNuvem(): Promise<Estado> {
  const [c, r, f, s, cfg] = await Promise.all([
    supabase.from("colaboradores").select("*").order("created_at"),
    supabase.from("registros_dia").select("*").limit(100000),
    supabase.from("feriados").select("data"),
    supabase.from("salarios_funcao").select("*"),
    supabase.from("configuracoes").select("*").eq("id", 1).maybeSingle(),
  ]);
  const cols = ok(c).map((x) => ({ id: x.id, nome: x.nome, cpf: x.cpf, funcao: x.funcao, ativo: x.ativo }));
  const marcas: Marcas = {}, horas: Horas = {}, pontos: Pontos = {};
  for (const x of ok(r)) {
    const k = `${x.colaborador_id}|${x.data}`;
    if (x.status) marcas[k] = x.status as Status;
    if (x.horas_manuais !== null) horas[k] = Number(x.horas_manuais);
    if (x.entrada_min !== null || x.saida_min !== null) pontos[k] = { e: x.entrada_min ?? undefined, s: x.saida_min ?? undefined };
  }
  const conf = cfg.error ? null : cfg.data;
  const salarios: Salarios = {
    ...SALARIOS_PADRAO,
    porFuncao: Object.fromEntries(ok(s).map((x) => [x.funcao, Number(x.salario)])),
    ...(conf ? { divisor: Number(conf.divisor), pct50: Number(conf.pct50), pct100: Number(conf.pct100) } : {}),
  };
  return { cols, marcas, horas, pontos, jornada: { feriados: ok(f).map((x) => x.data) }, salarios };
}

/** Copia uma única vez os dados guardados no navegador para o Supabase (casando colaboradores pelo CPF). */
async function migrarNavegador() {
  if (localStorage.getItem(KEY_MIG) || !localStorage.getItem("rjr-freq-colaboradores")) return;
  const local = loadData();
  const nuvem = ok(await supabase.from("colaboradores").select("id, cpf"));
  const porCpf = new Map(nuvem.map((x) => [padCpf(x.cpf), x.id]));
  const mapa = new Map<string, string>();
  for (const c of local.colaboradores) {
    const cpf = padCpf(c.cpf);
    let id = porCpf.get(cpf);
    const row = { nome: c.nome, cpf, funcao: c.funcao, ativo: c.ativo };
    if (id) ok(await supabase.from("colaboradores").update(row).eq("id", id));
    else { id = ok(await supabase.from("colaboradores").insert(row).select("id").single()).id; porCpf.set(cpf, id); }
    mapa.set(c.id, id);
  }
  const remap = <T,>(o: Record<string, T>) => Object.fromEntries(Object.entries(o).flatMap(([k, v]) => {
    const [id, d] = k.split("|"); const n = mapa.get(id ?? ""); return n ? [[`${n}|${d}`, v]] : [];
  }));
  const regs = [...paraRegistros({ marcas: remap(local.marcas), horas: remap(loadHoras()), pontos: remap(loadPontos()) }).values()];
  if (regs.length) ok(await supabase.from("registros_dia").upsert(regs, { onConflict: "colaborador_id,data" }));
  const fer = loadJornada().feriados;
  if (fer.length) ok(await supabase.from("feriados").upsert(fer.map((data) => ({ data }))));
  const sal = loadSalarios();
  const sf = Object.entries(sal.porFuncao).map(([funcao, salario]) => ({ funcao, salario }));
  if (sf.length) ok(await supabase.from("salarios_funcao").upsert(sf));
  ok(await supabase.from("configuracoes").upsert({ id: 1, divisor: sal.divisor, pct50: sal.pct50, pct100: sal.pct100 }));
  localStorage.setItem(KEY_MIG, new Date().toISOString());
}

export async function carregar(): Promise<Estado> {
  await migrarNavegador();
  return lerNuvem();
}

/** Grava no Supabase apenas o que mudou entre dois estados. */
export async function sincronizar(antes: Estado, depois: Estado) {
  const js = JSON.stringify;
  const antC = new Map(antes.cols.map((c) => [c.id, c]));
  const cs = depois.cols.filter((c) => js(antC.get(c.id)) !== js(c)).map((c) => ({ id: c.id, nome: c.nome, cpf: padCpf(c.cpf), funcao: c.funcao, ativo: c.ativo }));
  if (cs.length) ok(await supabase.from("colaboradores").upsert(cs));

  const a = paraRegistros(antes), b = paraRegistros(depois);
  const up = [...b].filter(([k, r]) => js(a.get(k)) !== js(r)).map(([, r]) => r);
  if (up.length) ok(await supabase.from("registros_dia").upsert(up, { onConflict: "colaborador_id,data" }));
  for (const [k, r] of a) if (!b.has(k)) ok(await supabase.from("registros_dia").delete().eq("colaborador_id", r.colaborador_id).eq("data", r.data));

  const fa = new Set(antes.jornada.feriados), fb = new Set(depois.jornada.feriados);
  const novos = [...fb].filter((d) => !fa.has(d)), rem = [...fa].filter((d) => !fb.has(d));
  if (novos.length) ok(await supabase.from("feriados").upsert(novos.map((data) => ({ data }))));
  if (rem.length) ok(await supabase.from("feriados").delete().in("data", rem));

  const sa = antes.salarios, sb = depois.salarios;
  const sf = Object.entries(sb.porFuncao).filter(([f, v]) => sa.porFuncao[f] !== v).map(([funcao, salario]) => ({ funcao, salario }));
  if (sf.length) ok(await supabase.from("salarios_funcao").upsert(sf));
  const remF = Object.keys(sa.porFuncao).filter((f) => !(f in sb.porFuncao));
  if (remF.length) ok(await supabase.from("salarios_funcao").delete().in("funcao", remF));
  if (sa.divisor !== sb.divisor || sa.pct50 !== sb.pct50 || sa.pct100 !== sb.pct100)
    ok(await supabase.from("configuracoes").upsert({ id: 1, divisor: sb.divisor, pct50: sb.pct50, pct100: sb.pct100 }));
}
