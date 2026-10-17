import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarX, Clock, DollarSign, FileSpreadsheet, LogIn, LogOut, FileText, Pencil, Plus, Search, UserX, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import logo from "@/assets/rjr-logo.jpg.asset.json";
import { calcPonto, ehFeriado, extrasDia, fimDia, fmtH, horasDia, jornadaDia, loadHoras, loadJornada, loadPontos, saveExtras, loadSalarios, saveSalarios, resumo, fmtR, SALARIOS_PADRAO, type Salarios, type Horas, type Jornada, type Ponto, type Pontos } from "@/lib/frequencia";
import { addDays, fmtCpf, iso, loadData, mondayOf, padCpf, saveData, type Colaborador, type Marcas, type Status } from "@/lib/frequencia";
import { exportPdf, exportXlsx } from "@/lib/exportar";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Controle de Frequência — RJR Construção Naval" },
      { name: "description", content: "Planilha interativa de presença dos colaboradores da RJR Construção Naval." },
      { property: "og:title", content: "Controle de Frequência — RJR Construção Naval" },
      { property: "og:description", content: "Planilha interativa de presença dos colaboradores da RJR Construção Naval." },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" },
    ],
  }),
  component: Index,
});

const NEXT: Record<string, Status | undefined> = { "": "P", P: "F", F: "J", J: undefined };
const PREV: Record<string, Status | undefined> = { "": "J", P: undefined, F: "P", J: "F" };
const CELL: Record<Status, string> = {
  P: "bg-present/20 text-present",
  F: "bg-absent/20 text-absent",
  J: "bg-justified/25 text-justified",
};
const WD = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function Index() {
  const [loaded, setLoaded] = useState(false);
  const [cols, setCols] = useState<Colaborador[]>([]);
  const [marcas, setMarcas] = useState<Marcas>({});
  const [modo, setModo] = useState<"semana" | "mes">("semana");
  const [ref, setRef] = useState(() => new Date());
  const [busca, setBusca] = useState("");
  const [funcao, setFuncao] = useState("");
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const [edit, setEdit] = useState<Colaborador | null>(null);
  const [horas, setHoras] = useState<Horas>({});
  const [jornada, setJornada] = useState<Jornada>({ feriados: [] });
  const [pontos, setPontos] = useState<Pontos>({});
  const [pontoOpen, setPontoOpen] = useState(false);
  const [horaEdit, setHoraEdit] = useState<{ k: string; d: Date; nome: string } | null>(null);
  const [cfgOpen, setCfgOpen] = useState(false);
  const [salarios, setSalarios] = useState<Salarios>(SALARIOS_PADRAO);
  const [salOpen, setSalOpen] = useState(false);
  const [ficha, setFicha] = useState<Colaborador | null>(null);

  useEffect(() => {
    const d = loadData();
    setCols(d.colaboradores);
    setMarcas(d.marcas);
    setHoras(loadHoras());
    setJornada(loadJornada());
    setPontos(loadPontos());
    setSalarios(loadSalarios());
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) saveData(cols, marcas);
  }, [cols, marcas, loaded]);
  useEffect(() => { if (loaded) saveSalarios(salarios); }, [salarios, loaded]);
  useEffect(() => {
    if (loaded) saveExtras(horas, jornada, pontos);
  }, [horas, jornada, pontos, loaded]);

  const dias = useMemo(() => {
    if (modo === "semana") {
      const m = mondayOf(ref);
      return [0, 1, 2, 3, 4, 5].map((i) => addDays(m, i));
    }
    const n = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
    return Array.from({ length: n }, (_, i) => new Date(ref.getFullYear(), ref.getMonth(), i + 1));
  }, [modo, ref]);

  const titulo =
    modo === "semana"
      ? `Semana ${dias[0]!.toLocaleDateString("pt-BR")} a ${dias[5]!.toLocaleDateString("pt-BR")}`
      : `${MESES[ref.getMonth()]} ${ref.getFullYear()}`;

  const funcoes = useMemo(() => [...new Set(cols.map((c) => c.funcao))].sort(), [cols]);
  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const qd = q.replace(/\D/g, "");
    return cols.filter(
      (c) =>
        (mostrarInativos || c.ativo) &&
        (!funcao || c.funcao === funcao) &&
        (!q || c.nome.toLowerCase().includes(q) || (qd && c.cpf.includes(qd))),
    );
  }, [cols, busca, funcao, mostrarInativos]);

  const navegar = (dir: number) => {
    const d = new Date(ref);
    if (modo === "semana") d.setDate(d.getDate() + 7 * dir);
    else d.setMonth(d.getMonth() + dir, 1);
    setRef(d);
  };

  const setMarca = (id: string, dia: string, s: Status | undefined) =>
    setMarcas((m) => {
      const n = { ...m };
      const k = `${id}|${dia}`;
      if (s) n[k] = s;
      else delete n[k];
      return n;
    });

  const marcarColuna = (dia: string) =>
    setMarcas((m) => {
      const n = { ...m };
      lista.filter((c) => c.ativo).forEach((c) => {
        const k = `${c.id}|${dia}`;
        if (!n[k]) n[k] = "P";
      });
      return n;
    });

  const total = (id: string, s: Status) => dias.filter((d) => marcas[`${id}|${iso(d)}`] === s).length;
  const totalDia = (dia: string, s: Status) => lista.filter((c) => marcas[`${c.id}|${dia}`] === s).length;
  const report = () => ({ titulo, dias, colaboradores: lista, marcas, horas, jornada, pontos });
  const somaH = (id: string) => dias.reduce((a, d) => a + horasDia(`${id}|${iso(d)}`, d, marcas, horas, jornada, pontos) - Math.min(horasDia(`${id}|${iso(d)}`, d, marcas, horas, jornada, pontos), extrasDia(`${id}|${iso(d)}`, d, marcas, horas, jornada, pontos)), 0);
  const somaE = (id: string) => dias.reduce((a, d) => a + extrasDia(`${id}|${iso(d)}`, d, marcas, horas, jornada, pontos), 0);
  const totH = lista.reduce((a, c) => a + somaH(c.id), 0);
  const totE = lista.reduce((a, c) => a + somaE(c.id), 0);
  const hoje = iso(new Date());
  const mensal = modo === "mes";

  const salvar = (c: Colaborador) => {
    setCols((cs) => (cs.some((x) => x.id === c.id) ? cs.map((x) => (x.id === c.id ? c : x)) : [...cs, c]));
    setEdit(null);
  };

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-4 px-4 py-3">
          <img src={logo.url} alt="RJR Construção Naval" className="h-10 w-auto" />
          <div className="mr-auto">
            <h1 className="text-lg font-bold leading-tight">Lista de Presença — Colaboradores</h1>
            <p className="text-xs text-muted-foreground">RJR Construção Naval · dados salvos neste navegador</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setCfgOpen(true)}>
            <CalendarX /> Feriados
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSalOpen(true)}>
            <DollarSign /> Salários
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setPontoOpen(true)}>
            <Clock /> Check-in / Check-out
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportXlsx(report())}>
            <FileSpreadsheet /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportPdf(report(), logo.url)}>
            <FileText /> PDF
          </Button>
          <Button size="sm" onClick={() => setEdit({ id: `c${Date.now()}`, nome: "", cpf: "", funcao: "", ativo: true })}>
            <Plus /> Colaborador
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-3 px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md border bg-card p-0.5">
            {(["semana", "mes"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setModo(m)}
                className={`rounded px-3 py-1 text-sm font-medium ${modo === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                {m === "semana" ? "Semanal" : "Mensal"}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="icon" onClick={() => navegar(-1)} aria-label="Anterior"><ChevronLeft /></Button>
          <span className="min-w-52 text-center text-sm font-semibold">{titulo}</span>
          <Button variant="ghost" size="icon" onClick={() => navegar(1)} aria-label="Próximo"><ChevronRight /></Button>
          <Button variant="ghost" size="sm" onClick={() => setRef(new Date())}>Hoje</Button>

          <div className="relative ml-auto">
            <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nome ou CPF" className="w-56 pl-8" />
          </div>
          <select value={funcao} onChange={(e) => setFuncao(e.target.value)} className="h-9 rounded-md border bg-card px-2 text-sm">
            <option value="">Todas as funções</option>
            {funcoes.map((f) => <option key={f}>{f}</option>)}
          </select>
          <label className="flex items-center gap-1 text-sm text-muted-foreground">
            <input type="checkbox" checked={mostrarInativos} onChange={(e) => setMostrarInativos(e.target.checked)} /> Inativos
          </label>
        </div>

        <p className="text-xs text-muted-foreground">
          Clique na célula para alternar: vazio → <b className="text-present">P</b> Presença → <b className="text-absent">F</b> Falta → <b className="text-justified">J</b> Justificada → vazio. Botão direito limpa. Duplo clique informa entrada e saída (ou o total de horas) do dia. Clique no dia para marcar presença em todos.
        </p>

        <div className="overflow-auto rounded-md border bg-card">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-muted">
              <tr>
                <th className="sticky left-0 z-20 min-w-60 border-b border-r bg-muted px-2 py-2 text-left">Nome</th>
                {!mensal && <th className="border-b border-r px-2 text-left">CPF</th>}
                <th className="border-b border-r px-2 text-left">Função</th>
                {dias.map((d) => {
                  const k = iso(d);
                  const fds = d.getDay() === 0 || ehFeriado(d, jornada);
                  return (
                    <th
                      key={k}
                      onClick={() => marcarColuna(k)}
                      title="Marcar presença para todos"
                      className={`cursor-pointer border-b border-r px-1 py-1 text-center text-xs hover:bg-accent ${fds ? "text-muted-foreground/60" : ""} ${k === hoje ? "bg-primary/15" : ""}`}
                    >
                      <div>{WD[d.getDay()]}</div>
                      <div className="font-mono">{String(d.getDate()).padStart(2, "0")}</div>
                      {ehFeriado(d, jornada) && <div className="text-[9px] text-primary">Feriado</div>}
                    </th>
                  );
                })}
                <th className="border-b border-r px-2 text-present">P</th>
                <th className="border-b border-r px-2 text-absent">F</th>
                <th className="border-b border-r px-2 text-justified">J</th>
                <th className="border-b border-r px-2">H. Normais</th>
                <th className="border-b border-r px-2 text-primary">H. Extras</th>
                <th className="border-b px-2"></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.id} className={`hover:bg-accent/40 ${c.ativo ? "" : "opacity-50"}`}>
                  <td className="sticky left-0 border-b border-r bg-card px-2 py-1 font-medium">
                    <button className="text-left hover:text-primary hover:underline" onClick={() => setFicha(c)}>{c.nome}</button>
                    {mensal && <div className="font-mono text-[11px] text-muted-foreground">{fmtCpf(c.cpf)}</div>}
                  </td>
                  {!mensal && <td className="whitespace-nowrap border-b border-r px-2 font-mono text-xs">{fmtCpf(c.cpf)}</td>}
                  <td className="whitespace-nowrap border-b border-r px-2 text-xs">{c.funcao}</td>
                  {dias.map((d) => {
                    const k = iso(d);
                    const v = marcas[`${c.id}|${k}`];
                    return (
                      <td key={k} className="border-b border-r p-0">
                        <button
                          disabled={!c.ativo}
                          onClick={(e) => e.detail === 1 && setMarca(c.id, k, NEXT[v ?? ""])}
                          onDoubleClick={() => (setMarca(c.id, k, PREV[v ?? ""]), setHoraEdit({ k: `${c.id}|${k}`, d, nome: c.nome }))}
                          onContextMenu={(e) => { e.preventDefault(); setMarca(c.id, k, undefined); }}
                          className={`h-8 w-full font-mono text-sm font-semibold ${mensal ? "min-w-7" : "min-w-14"} ${v ? CELL[v] : "hover:bg-accent"}`}
                        >
                          <div className="leading-none">{v ?? ""}</div>
                          {pontos[`${c.id}|${k}`] && !mensal ? (
                            <div className="text-[10px] font-normal leading-none text-foreground/70">
                              {hm(pontos[`${c.id}|${k}`]!.e)}–{hm(pontos[`${c.id}|${k}`]!.s)}
                            </div>
                          ) : horas[`${c.id}|${k}`] !== undefined && (
                            <div className="text-[10px] font-normal leading-none text-foreground/70">{fmtH(horas[`${c.id}|${k}`]!)}</div>
                          )}
                        </button>
                      </td>
                    );
                  })}
                  <td className="border-b border-r px-2 text-center font-mono text-present">{total(c.id, "P")}</td>
                  <td className="border-b border-r px-2 text-center font-mono text-absent">{total(c.id, "F")}</td>
                  <td className="border-b border-r px-2 text-center font-mono text-justified">{total(c.id, "J")}</td>
                  <td className="border-b border-r px-2 text-center font-mono">{fmtH(somaH(c.id))}</td>
                  <td className="border-b border-r px-2 text-center font-mono font-semibold text-primary">{fmtH(somaE(c.id))}</td>
                  <td className="whitespace-nowrap border-b px-1">
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => setEdit(c)} aria-label="Editar"><Pencil /></Button>
                    <Button
                      variant="ghost" size="icon" className="size-7"
                      onClick={() => setCols((cs) => cs.map((x) => (x.id === c.id ? { ...x, ativo: !x.ativo } : x)))}
                      aria-label={c.ativo ? "Desativar" : "Reativar"} title={c.ativo ? "Desativar" : "Reativar"}
                    >
                      {c.ativo ? <UserX /> : <UserCheck />}
                    </Button>
                  </td>
                </tr>
              ))}
              {lista.length === 0 && (
                <tr><td colSpan={dias.length + 10} className="p-6 text-center text-muted-foreground">Nenhum colaborador encontrado.</td></tr>
              )}
            </tbody>
            <tfoot className="bg-muted text-xs">
              {(["P", "F", "J"] as Status[]).map((s) => (
                <tr key={s}>
                  <td className="sticky left-0 border-r bg-muted px-2 py-1 font-semibold" colSpan={1}>
                    Total {s === "P" ? "presenças" : s === "F" ? "faltas" : "justificadas"}
                  </td>
                  <td className="border-r" colSpan={mensal ? 1 : 2}></td>
                  {dias.map((d) => (
                    <td key={iso(d)} className="border-r text-center font-mono">{totalDia(iso(d), s) || ""}</td>
                  ))}
                  <td colSpan={3}></td>
                  <td className="border-r text-center font-mono font-semibold">{s === "P" ? fmtH(totH) : ""}</td>
                  <td className="border-r text-center font-mono font-semibold text-primary">{s === "P" ? fmtH(totE) : ""}</td>
                  <td></td>
                </tr>
              ))}
            </tfoot>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">{lista.length} colaborador(es) exibido(s) · {cols.filter((c) => c.ativo).length} ativo(s)</p>
      </main>

      <HorasDialog
        alvo={horaEdit}
        valor={horaEdit ? horas[horaEdit.k] : undefined}
        ponto={horaEdit ? pontos[horaEdit.k] : undefined}
        cfg={jornada}
        onClose={() => setHoraEdit(null)}
        onSave={(n, pt) => {
          if (!horaEdit) return;
          const k = horaEdit.k;
          setPontos((ps) => { const x = { ...ps }; if (pt) x[k] = pt; else delete x[k]; return x; });
          if (pt && !marcas[k]) setMarcas((m) => ({ ...m, [k]: "P" }));
          setHoras((h) => { const x = { ...h }; if (n === undefined) delete x[k]; else x[k] = n; return x; });
          if (n !== undefined && n > 0 && !marcas[k]) setMarcas((m) => ({ ...m, [k]: "P" }));
          setHoraEdit(null);
        }}
      />
      <FeriadosDialog open={cfgOpen} jornada={jornada} onClose={() => setCfgOpen(false)} onSave={(j) => { setJornada(j); setCfgOpen(false); }} />
      <PontoDialog
        open={pontoOpen}
        colaboradores={cols.filter((c) => c.ativo)}
        pontos={pontos}
        cfg={jornada}
        onClose={() => setPontoOpen(false)}
        onMarcar={(id, tipo) => {
          const now = new Date();
          const k = `${id}|${iso(now)}`;
          const min = now.getHours() * 60 + now.getMinutes();
          setPontos((ps) => ({ ...ps, [k]: { ...ps[k], [tipo]: min } }));
          setMarcas((m) => ({ ...m, [k]: "P" }));
        }}
      />
      <SalariosDialog open={salOpen} funcoes={funcoes} valor={salarios} onClose={() => setSalOpen(false)} onSave={(v) => { setSalarios(v); setSalOpen(false); }} />
      <FichaDialog colab={ficha} periodo={titulo} r={ficha ? resumo(ficha.id, ficha.funcao, dias, marcas, horas, jornada, pontos, salarios) : null} onClose={() => setFicha(null)} onSalarios={() => { setFicha(null); setSalOpen(true); }} />
      <ColabDialog colab={edit} funcoes={funcoes} onClose={() => setEdit(null)} onSave={salvar} />
    </div>
  );
}

function ColabDialog({ colab, funcoes, onClose, onSave }: { colab: Colaborador | null; funcoes: string[]; onClose: () => void; onSave: (c: Colaborador) => void }) {
  const [f, setF] = useState<Colaborador | null>(colab);
  useEffect(() => setF(colab), [colab]);
  if (!f) return null;
  const valido = f.nome.trim() && f.cpf.replace(/\D/g, "").length >= 9 && f.funcao.trim();
  return (
    <Dialog open={!!colab} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{f.nome ? "Editar colaborador" : "Novo colaborador"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <label className="block text-sm">Nome<Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></label>
          <label className="block text-sm">CPF<Input value={f.cpf} inputMode="numeric" onChange={(e) => setF({ ...f, cpf: e.target.value.replace(/\D/g, "").slice(0, 11) })} /></label>
          <label className="block text-sm">Função
            <Input list="funcoes" value={f.funcao} onChange={(e) => setF({ ...f, funcao: e.target.value })} />
            <datalist id="funcoes">{funcoes.map((x) => <option key={x} value={x} />)}</datalist>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!valido} onClick={() => onSave({ ...f, nome: f.nome.trim(), funcao: f.funcao.trim(), cpf: padCpf(f.cpf) })}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const parseH = (t: string): number | undefined => {
  const v = t.trim();
  if (!v) return undefined;
  if (v.includes(":")) {
    const [h, m] = v.split(":");
    return Number(h) + Number(m || 0) / 60;
  }
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
};

const hm = (n?: number) => (n === undefined ? "--:--" : fmtH(n / 60));
const parseMin = (t: string) => { const h = parseH(t); return h === undefined ? undefined : Math.round(h * 60); };

function HorasDialog({ alvo, valor, ponto, cfg, onClose, onSave }: { alvo: { k: string; d: Date; nome: string } | null; valor: number | undefined; ponto: Ponto | undefined; cfg: Jornada; onClose: () => void; onSave: (n: number | undefined, p: Ponto | undefined) => void }) {
  const [t, setT] = useState("");
  const [e, setE] = useState("");
  const [s, setS] = useState("");
  useEffect(() => {
    setT(valor !== undefined ? fmtH(valor) : "");
    setE(ponto?.e !== undefined ? hm(ponto.e) : "");
    setS(ponto?.s !== undefined ? hm(ponto.s) : "");
  }, [alvo, valor, ponto]);
  const n = parseH(t);
  const pt: Ponto | undefined = e || s ? { e: parseMin(e), s: parseMin(s) } : undefined;
  const fim = alvo ? fimDia(alvo.d, cfg) : null;
  const calc = alvo ? calcPonto(pt, alvo.d, cfg) : null;
  const jornada = alvo ? jornadaDia(alvo.d, cfg) : 0;
  const salvar = () => onSave(pt ? undefined : n, pt);
  return (
    <Dialog open={!!alvo} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Entrada, saída e horas</DialogTitle></DialogHeader>
        {alvo && (
          <p className="text-sm text-muted-foreground">
            {alvo.nome} · {alvo.d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" })} ·{" "}
            {fim === null ? "todas as horas contam como extra" : `expediente 07:00–${hm(fim)}`}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">Entrada (check-in)<Input placeholder="07:00" value={e} onChange={(x) => setE(x.target.value)} /></label>
          <label className="block text-sm">Saída (check-out)<Input placeholder={fim ? hm(fim) : "17:00"} value={s} onChange={(x) => setS(x.target.value)} /></label>
        </div>
        {calc && <p className="text-sm">Horas: <b>{fmtH(calc.h)}</b> · Hora extra: <b className="text-primary">{fmtH(calc.e)}</b></p>}
        {!pt && (
          <>
            <label className="block text-sm">Ou informe só o total de horas (ex.: 10:30 ou 10,5)
              <Input value={t} onChange={(x) => setT(x.target.value)} onKeyDown={(x) => x.key === "Enter" && salvar()} />
            </label>
            {n !== undefined && <p className="text-sm">Hora extra no dia: <b className="text-primary">{fmtH(Math.max(0, n - jornada))}</b></p>}
          </>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onSave(undefined, undefined)}>Limpar horários</Button>
          <Button onClick={salvar}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PontoDialog({ open, colaboradores, pontos, cfg, onClose, onMarcar }: { open: boolean; colaboradores: Colaborador[]; pontos: Pontos; cfg: Jornada; onClose: () => void; onMarcar: (id: string, t: "e" | "s") => void }) {
  const [q, setQ] = useState("");
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => { if (!open) return; const t = setInterval(() => setAgora(new Date()), 15000); return () => clearInterval(t); }, [open]);
  const dia = iso(agora);
  const fim = fimDia(agora, cfg);
  const ql = q.trim().toLowerCase();
  const lista = colaboradores.filter((c) => !ql || c.nome.toLowerCase().includes(ql) || c.cpf.includes(ql.replace(/\D/g, "") || "x"));
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Check-in / Check-out — {agora.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" })} {hm(agora.getHours() * 60 + agora.getMinutes())}</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">
          {fim === null ? "Sábado, domingo ou feriado: todas as horas contam como extra." : `Expediente 07:00–${hm(fim)}. Entrada a partir de 06:45 e saída a partir de ${hm(fim - 15)} contam como horário normal, sem extra.`}
        </p>
        <Input placeholder="Buscar nome ou CPF" value={q} onChange={(x) => setQ(x.target.value)} />
        <div className="max-h-[55vh] divide-y overflow-auto rounded-md border">
          {lista.map((c) => {
            const p = pontos[`${c.id}|${dia}`];
            const r = calcPonto(p, agora, cfg);
            return (
              <div key={c.id} className="flex items-center gap-2 px-2 py-1.5 text-sm">
                <div className="mr-auto">
                  <div className="font-medium">{c.nome}</div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {hm(p?.e)} → {hm(p?.s)}{r ? ` · ${fmtH(r.h)}h${r.e ? ` (+${fmtH(r.e)} extra)` : ""}` : ""}
                  </div>
                </div>
                <Button size="sm" variant={p?.e !== undefined ? "outline" : "default"} onClick={() => onMarcar(c.id, "e")}><LogIn /> Entrada</Button>
                <Button size="sm" variant="outline" disabled={p?.e === undefined} onClick={() => onMarcar(c.id, "s")}><LogOut /> Saída</Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FeriadosDialog({ open, jornada, onClose, onSave }: { open: boolean; jornada: Jornada; onClose: () => void; onSave: (j: Jornada) => void }) {
  const [lista, setLista] = useState<string[]>([]);
  const [d, setD] = useState("");
  useEffect(() => setLista([...jornada.feriados].sort()), [open, jornada]);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Feriados</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Em feriados, sábados e domingos todas as horas trabalhadas contam como hora extra.</p>
        <div className="flex gap-2">
          <Input type="date" value={d} onChange={(e) => setD(e.target.value)} />
          <Button variant="outline" disabled={!d} onClick={() => { if (!lista.includes(d)) setLista([...lista, d].sort()); setD(""); }}><Plus /> Adicionar</Button>
        </div>
        <ul className="max-h-60 divide-y overflow-auto rounded-md border text-sm">
          {lista.length === 0 && <li className="p-3 text-muted-foreground">Nenhum feriado cadastrado.</li>}
          {lista.map((f) => (
            <li key={f} className="flex items-center justify-between px-3 py-1">
              {new Date(`${f}T12:00`).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" })}
              <Button variant="ghost" size="sm" onClick={() => setLista(lista.filter((x) => x !== f))}>Remover</Button>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave({ ...jornada, feriados: lista })}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SalariosDialog({ open, funcoes, valor, onClose, onSave }: { open: boolean; funcoes: string[]; valor: Salarios; onClose: () => void; onSave: (s: Salarios) => void }) {
  const [f, setF] = useState(valor);
  useEffect(() => { if (open) setF(valor); }, [open, valor]);
  const num = (v: string) => { const n = parseFloat(v.replace(/\./g, "").replace(",", ".")); return Number.isFinite(n) ? n : 0; };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Salário mensal por função</DialogTitle></DialogHeader>
        <div className="space-y-2">
          {funcoes.map((fn) => (
            <label key={fn} className="flex items-center justify-between gap-3 text-sm">
              <span>{fn}</span>
              <Input className="w-36 text-right" inputMode="decimal" placeholder="0,00"
                defaultValue={f.porFuncao[fn] ? String(f.porFuncao[fn]).replace(".", ",") : ""}
                onChange={(e) => setF((x) => ({ ...x, porFuncao: { ...x.porFuncao, [fn]: num(e.target.value) } }))} />
            </label>
          ))}
          <div className="grid grid-cols-3 gap-2 border-t pt-3 text-xs">
            <label>Horas/mês (divisor)<Input type="number" value={f.divisor} onChange={(e) => setF({ ...f, divisor: Number(e.target.value) })} /></label>
            <label>Extra seg–sáb (%)<Input type="number" value={f.pct50} onChange={(e) => setF({ ...f, pct50: Number(e.target.value) })} /></label>
            <label>Extra dom/feriado (%)<Input type="number" value={f.pct100} onChange={(e) => setF({ ...f, pct100: Number(e.target.value) })} /></label>
          </div>
          <p className="text-xs text-muted-foreground">Valor da hora = salário ÷ horas/mês.</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave(f)}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FichaDialog({ colab, periodo, r, onClose, onSalarios }: { colab: Colaborador | null; periodo: string; r: ReturnType<typeof resumo> | null; onClose: () => void; onSalarios: () => void }) {
  const L = ({ a, b, c }: { a: string; b: string; c?: string }) => (
    <div className="flex justify-between border-b py-1.5 text-sm"><span className="text-muted-foreground">{a}</span><span className="font-mono">{b}{c && <span className="ml-3 font-semibold">{c}</span>}</span></div>
  );
  return (
    <Dialog open={!!colab} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        {colab && r && (<>
          <DialogHeader><DialogTitle>{colab.nome}</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">{fmtCpf(colab.cpf)} · {colab.funcao} · {periodo}</p>
          <div>
            <L a="Presenças / Faltas / Justificadas" b={`${r.p} / ${r.f} / ${r.j}`} />
            <L a="Salário mensal da função" b={r.salario ? fmtR(r.salario) : "não informado"} />
            <L a="Valor da hora" b={fmtR(r.valorHora)} />
            <L a="Horas normais" b={fmtH(r.normais)} c={fmtR(r.vNormal)} />
            <L a="Horas extras (seg–sáb)" b={fmtH(r.e50)} c={fmtR(r.v50)} />
            <L a="Horas extras (dom/feriado)" b={fmtH(r.e100)} c={fmtR(r.v100)} />
            <div className="flex justify-between pt-3 text-base font-bold"><span>Total a receber no período</span><span className="font-mono text-primary">{fmtR(r.total)}</span></div>
          </div>
          {!r.salario && <p className="text-xs text-absent">Informe o salário da função para calcular os valores.</p>}
          <DialogFooter><Button variant="outline" onClick={onSalarios}>Editar salários</Button><Button onClick={onClose}>Fechar</Button></DialogFooter>
        </>)}
      </DialogContent>
    </Dialog>
  );
}
