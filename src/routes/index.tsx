import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, FileSpreadsheet, FileText, Pencil, Plus, Search, UserX, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import logo from "@/assets/rjr-logo.jpg.asset.json";
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

  useEffect(() => {
    const d = loadData();
    setCols(d.colaboradores);
    setMarcas(d.marcas);
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) saveData(cols, marcas);
  }, [cols, marcas, loaded]);

  const dias = useMemo(() => {
    if (modo === "semana") {
      const m = mondayOf(ref);
      return [0, 1, 2, 3, 4].map((i) => addDays(m, i));
    }
    const n = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
    return Array.from({ length: n }, (_, i) => new Date(ref.getFullYear(), ref.getMonth(), i + 1));
  }, [modo, ref]);

  const titulo =
    modo === "semana"
      ? `Semana ${dias[0]!.toLocaleDateString("pt-BR")} a ${dias[4]!.toLocaleDateString("pt-BR")}`
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
  const report = () => ({ titulo, dias, colaboradores: lista, marcas });
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
          Clique na célula para alternar: vazio → <b className="text-present">P</b> Presença → <b className="text-absent">F</b> Falta → <b className="text-justified">J</b> Justificada → vazio. Botão direito limpa. Clique no dia para marcar presença em todos.
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
                  const fds = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <th
                      key={k}
                      onClick={() => marcarColuna(k)}
                      title="Marcar presença para todos"
                      className={`cursor-pointer border-b border-r px-1 py-1 text-center text-xs hover:bg-accent ${fds ? "text-muted-foreground/60" : ""} ${k === hoje ? "bg-primary/15" : ""}`}
                    >
                      <div>{WD[d.getDay()]}</div>
                      <div className="font-mono">{String(d.getDate()).padStart(2, "0")}</div>
                    </th>
                  );
                })}
                <th className="border-b border-r px-2 text-present">P</th>
                <th className="border-b border-r px-2 text-absent">F</th>
                <th className="border-b border-r px-2 text-justified">J</th>
                <th className="border-b px-2"></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.id} className={`hover:bg-accent/40 ${c.ativo ? "" : "opacity-50"}`}>
                  <td className="sticky left-0 border-b border-r bg-card px-2 py-1 font-medium">
                    {c.nome}
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
                          onClick={() => setMarca(c.id, k, NEXT[v ?? ""])}
                          onContextMenu={(e) => { e.preventDefault(); setMarca(c.id, k, undefined); }}
                          className={`h-8 w-full font-mono text-sm font-semibold ${mensal ? "min-w-7" : "min-w-14"} ${v ? CELL[v] : "hover:bg-accent"}`}
                        >
                          {v ?? ""}
                        </button>
                      </td>
                    );
                  })}
                  <td className="border-b border-r px-2 text-center font-mono text-present">{total(c.id, "P")}</td>
                  <td className="border-b border-r px-2 text-center font-mono text-absent">{total(c.id, "F")}</td>
                  <td className="border-b border-r px-2 text-center font-mono text-justified">{total(c.id, "J")}</td>
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
                <tr><td colSpan={dias.length + 8} className="p-6 text-center text-muted-foreground">Nenhum colaborador encontrado.</td></tr>
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
                  <td colSpan={4}></td>
                </tr>
              ))}
            </tfoot>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">{lista.length} colaborador(es) exibido(s) · {cols.filter((c) => c.ativo).length} ativo(s)</p>
      </main>

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
