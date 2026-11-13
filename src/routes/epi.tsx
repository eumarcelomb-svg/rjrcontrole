import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, Plus, Search, Pencil, Trash2, ShieldCheck, FileText, RotateCw, PackageCheck, Users, PenLine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { EpiDialog } from "@/components/epi-dialog";
import { EntregaEpiDialog } from "@/components/entrega-epi-dialog";
import { listarControleEpi, excluirEntregaEpi } from "@/lib/entregas-epi.functions";
import { filtrarEntregasEpi, resumoEntregasEpi, type EntregaEpi } from "@/lib/entregas-epi";
import logo from "@/assets/rjr-logo.jpg.asset.json";

const epiQuery = queryOptions({ queryKey: ["controle-epi"], queryFn: () => listarControleEpi() });
type Filtros = { q?: string; funcao?: string; assinatura?: string; inicio?: string; fim?: string };

export const Route = createFileRoute("/epi")({
  validateSearch: (search: Record<string, unknown>): Filtros => ({
    q: typeof search.q === "string" ? search.q : undefined,
    funcao: typeof search.funcao === "string" ? search.funcao : undefined,
    assinatura: search.assinatura === "confirmada" || search.assinatura === "pendente" ? search.assinatura : undefined,
    inicio: typeof search.inicio === "string" ? search.inicio : undefined,
    fim: typeof search.fim === "string" ? search.fim : undefined,
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(epiQuery),
  head: () => ({ meta: [
    { title: "Controle de EPI — RJR Construção Naval" },
    { name: "description", content: "Acompanhamento de entregas de EPI e recebimento pelos colaboradores da RJR Construção Naval." },
    { property: "og:title", content: "Controle de EPI — RJR Construção Naval" },
    { property: "og:description", content: "Histórico de equipamentos, quantidades e confirmações de recebimento de EPI." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ], links: [{ rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" }] }),
  pendingComponent: () => <div className="p-8 text-sm text-muted-foreground">Carregando controle de EPI…</div>,
  errorComponent: EpiError,
  notFoundComponent: () => <div className="p-8">Controle de EPI não encontrado.</div>,
  component: ControleEpi,
});

function EpiError() {
  const router = useRouter();
  return <main className="mx-auto max-w-xl space-y-4 p-6"><h1 className="text-xl font-bold">Controle de EPI indisponível</h1><p role="alert">Não foi possível carregar os dados. Verifique sua conexão.</p><div className="flex gap-2"><Button onClick={() => router.invalidate()}><RotateCw />Tentar novamente</Button><Button variant="outline" asChild><Link to="/">Voltar à frequência</Link></Button></div></main>;
}

function ControleEpi() {
  const { data } = useSuspenseQuery(epiQuery);
  const queryClient = useQueryClient();
  const filtros = Route.useSearch();
  const navigate = Route.useNavigate();
  const [editando, setEditando] = useState<{ entrega: EntregaEpi | null } | null>(null);
  const [excluindo, setExcluindo] = useState<EntregaEpi | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [fichaOpen, setFichaOpen] = useState(false);
  const linhas = useMemo(() => filtrarEntregasEpi(data.entregas, filtros), [data.entregas, filtros]);
  const totais = resumoEntregasEpi(linhas);
  const funcoes = [...new Set([...data.colaboradores.map((c) => c.funcao), ...data.entregas.map((e) => e.colaborador_funcao)])].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const filtro = (key: keyof Filtros, value: string) => void navigate({ search: (prev) => ({ ...prev, [key]: value || undefined }), replace: true });
  async function atualizar() { await queryClient.invalidateQueries({ queryKey: epiQuery.queryKey }); }
  async function excluir() {
    if (!excluindo) return;
    setOcupado(true);
    try { await excluirEntregaEpi({ data: excluindo.id }); setExcluindo(null); toast.success("Entrega excluída."); await atualizar(); }
    catch { toast.error("Não foi possível excluir a entrega."); }
    finally { setOcupado(false); }
  }
  const status = (e: EntregaEpi) => <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${e.assinatura_confirmada ? "text-present" : "text-absent"}`}>{e.assinatura_confirmada ? <ShieldCheck className="size-4 shrink-0" /> : <PenLine className="size-4 shrink-0" />}{e.assinatura_confirmada ? "Confirmada" : "Pendente"}</span>;
  const acoes = (e: EntregaEpi) => <div className="flex gap-1"><Button variant="ghost" size="icon" title="Editar entrega" aria-label={`Editar entrega de ${e.equipamento} para ${e.colaborador_nome}`} onClick={() => setEditando({ entrega: e })}><Pencil /></Button><Button variant="ghost" size="icon" className="text-destructive" title="Excluir entrega" aria-label={`Excluir entrega de ${e.equipamento} para ${e.colaborador_nome}`} onClick={() => setExcluindo(e)}><Trash2 /></Button></div>;
  return <div className="min-h-screen bg-background text-foreground">
    <header className="border-b bg-card"><div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-4 py-4 sm:px-6">
      <img src={logo.url} alt="RJR Construção Naval" className="h-10 w-auto" /><div className="mr-auto min-w-0"><h1 className="text-xl font-bold">Controle de EPI</h1><p className="text-xs text-muted-foreground">RJR Construção Naval</p></div>
      <Button variant="outline" asChild><Link to="/"><ArrowLeft />Frequência</Link></Button>
    </div></header>
    <main className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Entregas aos colaboradores</h2><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setFichaOpen(true)} disabled={!data.colaboradores.length}><FileText />Ficha para assinatura</Button><Button onClick={() => setEditando({ entrega: null })} disabled={!data.colaboradores.length}><Plus />Registrar entrega</Button></div></div>
      <section aria-label="Resumo das entregas" className="grid grid-cols-2 gap-y-5 border-y py-5 md:grid-cols-4">
        {[{ label: "Entregas registradas", value: totais.entregas, Icon: PackageCheck }, { label: "Unidades entregues", value: totais.unidades, Icon: ShieldCheck }, { label: "Colaboradores atendidos", value: totais.colaboradores, Icon: Users }, { label: "Assinaturas pendentes", value: totais.pendentes, Icon: PenLine }].map(({ label, value, Icon }) => <div key={label} className="flex items-start gap-3 pr-3"><Icon className="mt-1 size-5 shrink-0 text-muted-foreground" /><div><p className="font-mono text-2xl font-semibold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></div>)}
      </section>
      <section aria-label="Filtros de entregas" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1.5"><label htmlFor="epi-busca" className="text-xs font-medium">Busca</label><div className="relative"><Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input id="epi-busca" placeholder="Nome ou equipamento" className="pl-9" value={filtros.q ?? ""} onChange={(e) => filtro("q", e.target.value)} /></div></div>
        <div className="space-y-1.5"><label htmlFor="epi-funcao" className="text-xs font-medium">Função</label><Select value={filtros.funcao || "todas"} onValueChange={(v) => filtro("funcao", v === "todas" ? "" : v)}><SelectTrigger id="epi-funcao"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todas">Todas as funções</SelectItem>{funcoes.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5"><label htmlFor="epi-assinatura" className="text-xs font-medium">Assinatura na ficha</label><Select value={filtros.assinatura || "todas"} onValueChange={(v) => filtro("assinatura", v === "todas" ? "" : v)}><SelectTrigger id="epi-assinatura"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todas">Todas</SelectItem><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="confirmada">Confirmada</SelectItem></SelectContent></Select></div>
        <div className="space-y-1.5"><label htmlFor="epi-inicio" className="text-xs font-medium">De</label><Input id="epi-inicio" type="date" value={filtros.inicio ?? ""} onChange={(e) => filtro("inicio", e.target.value)} /></div>
        <div className="space-y-1.5"><label htmlFor="epi-fim" className="text-xs font-medium">Até</label><Input id="epi-fim" type="date" value={filtros.fim ?? ""} onChange={(e) => filtro("fim", e.target.value)} /></div>
      </section>
      <div className="flex items-center justify-between gap-2"><h2 className="text-base font-semibold">Histórico <span className="font-normal text-muted-foreground">· {linhas.length}</span></h2><div className="flex items-center gap-2"><Button variant="ghost" size="sm" onClick={() => void navigate({ search: {}, replace: true })}>Limpar filtros</Button><Button size="icon" variant="ghost" title="Atualizar histórico" aria-label="Atualizar histórico" onClick={() => void atualizar().catch(() => toast.error("Não foi possível atualizar."))}><RotateCw /></Button></div></div>
      {filtros.inicio && filtros.fim && filtros.inicio > filtros.fim && <p role="alert" className="text-sm text-destructive">A data inicial deve ser anterior ou igual à data final.</p>}
      {!linhas.length ? <div className="border-y py-14 text-center"><PackageCheck className="mx-auto mb-3 size-8 text-muted-foreground" /><h3 className="font-medium">{data.entregas.length ? "Nenhuma entrega para estes filtros" : "Nenhuma entrega registrada"}</h3></div> : <>
        <div className="hidden overflow-x-auto border-y md:block"><table className="w-full text-sm"><thead className="bg-muted text-left text-xs text-muted-foreground"><tr>{["Data", "Colaborador / função", "EPI / CA", "Qtd.", "Responsável", "Assinatura", ""].map((h) => <th key={h} className="px-3 py-3 font-medium">{h}</th>)}</tr></thead><tbody className="divide-y">{linhas.map((e) => <tr key={e.id} className="bg-card"><td className="whitespace-nowrap px-3 py-4 font-mono text-xs">{e.data_entrega.split("-").reverse().join("/")}</td><td className="px-3 py-4"><p className="font-medium">{e.colaborador_nome}</p><p className="text-xs text-muted-foreground">{e.colaborador_funcao}</p></td><td className="max-w-64 px-3 py-4"><p className="break-words font-medium">{e.equipamento}</p>{e.ca && <p className="text-xs text-muted-foreground">CA: {e.ca}</p>}{e.observacoes && <p className="mt-1 break-words text-xs text-muted-foreground">{e.observacoes}</p>}</td><td className="px-3 py-4 font-mono">{e.quantidade}</td><td className="max-w-44 break-words px-3 py-4">{e.responsavel || "—"}</td><td className="px-3 py-4">{status(e)}</td><td className="px-2 py-4">{acoes(e)}</td></tr>)}</tbody></table></div>
        <div className="space-y-3 md:hidden">{linhas.map((e) => <article key={e.id} className="space-y-3 rounded border bg-card p-4"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="break-words text-sm font-semibold">{e.colaborador_nome}</h3><p className="break-words text-xs text-muted-foreground">{e.colaborador_funcao}</p></div>{acoes(e)}</div><div className="flex justify-between gap-3"><p className="min-w-0 break-words text-sm font-medium">{e.equipamento}{e.ca && <span className="block text-xs font-normal text-muted-foreground">CA: {e.ca}</span>}</p><p className="shrink-0 font-mono text-sm">Qtd. {e.quantidade}</p></div><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-muted-foreground">{e.data_entrega.split("-").reverse().join("/")}</span>{status(e)}</div>{e.responsavel && <p className="break-words text-xs text-muted-foreground">Responsável: {e.responsavel}</p>}{e.observacoes && <p className="break-words text-xs text-muted-foreground">{e.observacoes}</p>}</article>)}</div>
      </>}
    </main>
    {editando && <EntregaEpiDialog colaboradores={data.colaboradores} entrega={editando.entrega} onClose={() => setEditando(null)} onSaved={atualizar} />}
    {fichaOpen && <EpiDialog colaboradores={data.colaboradores.map((c) => ({ ...c, cpf: "" }))} onClose={() => setFichaOpen(false)} />}
    {excluindo && <Dialog open onOpenChange={(open) => { if (!open && !ocupado) setExcluindo(null); }}><DialogContent><DialogHeader><DialogTitle>Excluir entrega?</DialogTitle><DialogDescription>{excluindo.equipamento} · {excluindo.colaborador_nome}. Esta ação não pode ser desfeita.</DialogDescription></DialogHeader><DialogFooter className="gap-2"><Button variant="outline" disabled={ocupado} onClick={() => setExcluindo(null)}>Cancelar</Button><Button variant="destructive" disabled={ocupado} onClick={excluir}><Trash2 />{ocupado ? "Excluindo…" : "Excluir entrega"}</Button></DialogFooter></DialogContent></Dialog>}
  </div>;
}