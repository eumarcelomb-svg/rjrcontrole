import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Coffee, Utensils, Save, Pencil, Trash2, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { carregarRefeicoes, gravarRefeicoes, registrarRefeicao, filtrarRefeicoes, totalRefeicoes, PRECO_CAFE, PRECO_ALMOCO, type Refeicao } from "@/lib/refeicoes";
import { fmtR, iso } from "@/lib/frequencia";
import logo from "@/assets/rjr-logo.jpg.asset.json";

export const Route = createFileRoute("/refeicoes")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Controle de refeições — RJR Construção Naval" },
    { name: "description", content: "Quantidades diárias de cafés da manhã e almoços dos colaboradores, com custos e histórico por período." },
    { property: "og:title", content: "Controle de refeições — RJR Construção Naval" },
    { property: "og:description", content: "Controle diário de café da manhã e almoço da RJR Construção Naval." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ], links: [{ rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" }] }),
  component: ControleRefeicoes,
});

function ControleRefeicoes() {
  const [registros, setRegistros] = useState<Refeicao[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [erro, setErro] = useState(false);
  const [data, setData] = useState("");
  const [cafes, setCafes] = useState("");
  const [almocos, setAlmocos] = useState("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [excluindo, setExcluindo] = useState<Refeicao | null>(null);
  function carregar() {
    try { setRegistros(carregarRefeicoes()); setLoaded(true); setErro(false); }
    catch { setErro(true); setLoaded(false); }
  }
  useEffect(() => {
    carregar();
    const hoje = iso(new Date());
    setData(hoje);
    setInicio(`${hoje.slice(0, 7)}-01`);
    setFim(iso(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)));
  }, []);
  const existente = registros.find((r) => r.data === data);
  const intervaloInvalido = !!inicio && !!fim && inicio > fim;
  const linhas = intervaloInvalido ? [] : filtrarRefeicoes(registros, inicio, fim);
  const totais = totalRefeicoes(linhas);
  const preview = totalRefeicoes([{ data, cafes: Number(cafes) || 0, almocos: Number(almocos) || 0 }]);
  const formatarData = (d: string) => d.split("-").reverse().join("/");
  function selecionarDia(d: string) {
    setData(d);
    const r = registros.find((registro) => registro.data === d);
    setCafes(r ? String(r.cafes) : "");
    setAlmocos(r ? String(r.almocos) : "");
  }
  function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!loaded || cafes === "" || almocos === "") return;
    try {
      // Read latest device state so another open tab's days are not replaced.
      const novos = registrarRefeicao(carregarRefeicoes(), { data, cafes: Number(cafes), almocos: Number(almocos) });
      gravarRefeicoes(novos);
      setRegistros(novos);
      toast.success("Quantidades salvas.");
    } catch { toast.error("Não foi possível salvar. Confira as quantidades e o armazenamento deste aparelho."); }
  }
  function excluir() {
    if (!excluindo) return;
    try {
      const novos = carregarRefeicoes().filter((r) => r.data !== excluindo.data);
      gravarRefeicoes(novos);
      setRegistros(novos);
      if (data === excluindo.data) { setCafes(""); setAlmocos(""); }
      setExcluindo(null);
      toast.success("Registro excluído.");
    } catch { toast.error("Não foi possível excluir o registro."); }
  }
  const acoes = (r: Refeicao) => <div className="flex gap-1"><Button variant="ghost" size="icon" title="Editar quantidades" aria-label={`Editar ${formatarData(r.data)}`} onClick={() => { selecionarDia(r.data); document.getElementById("refeicao-data")?.focus(); }}><Pencil /></Button><Button variant="ghost" size="icon" className="text-destructive" title="Excluir registro" aria-label={`Excluir ${formatarData(r.data)}`} onClick={() => setExcluindo(r)}><Trash2 /></Button></div>;
  return <div className="min-h-screen bg-background text-foreground">
    <header className="border-b bg-card"><div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-4 py-4 sm:px-6">
      <img src={logo.url} alt="RJR Construção Naval" className="h-10 w-auto" /><div className="mr-auto min-w-0"><h1 className="text-xl font-bold">Controle de refeições</h1><p className="text-xs text-muted-foreground">RJR Construção Naval</p></div>
      <Button variant="outline" asChild><Link to="/"><ArrowLeft />Frequência</Link></Button>
    </div></header>
    <main className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6">
      {erro ? <section className="space-y-3 border-y py-6"><p role="alert">Não foi possível ler os registros deste aparelho. Os dados existentes não foram alterados.</p><Button variant="outline" onClick={carregar}><RotateCw />Tentar novamente</Button></section> : <>
        <section aria-label="Quantidades diárias" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">{existente ? "Editar quantidades do dia" : "Registrar quantidades do dia"}</h2><span className="text-xs text-muted-foreground">Salvo neste aparelho</span></div>
          <form onSubmit={salvar} className="grid items-end gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <div className="space-y-1.5"><label htmlFor="refeicao-data" className="text-sm font-medium">Data</label><Input id="refeicao-data" type="date" required value={data} disabled={!loaded} onChange={(e) => selecionarDia(e.target.value)} /></div>
            <div className="space-y-1.5"><label htmlFor="refeicao-cafes" className="flex items-center gap-2 text-sm font-medium"><Coffee className="size-4 text-muted-foreground" />Cafés da manhã</label><Input id="refeicao-cafes" type="number" inputMode="numeric" min="0" max="100000" step="1" required placeholder="Quantidade" value={cafes} disabled={!loaded} onChange={(e) => setCafes(e.target.value)} /><p className="text-xs text-muted-foreground">{fmtR(PRECO_CAFE)} por pessoa</p></div>
            <div className="space-y-1.5"><label htmlFor="refeicao-almocos" className="flex items-center gap-2 text-sm font-medium"><Utensils className="size-4 text-muted-foreground" />Almoços</label><Input id="refeicao-almocos" type="number" inputMode="numeric" min="0" max="100000" step="1" required placeholder="Quantidade" value={almocos} disabled={!loaded} onChange={(e) => setAlmocos(e.target.value)} /><p className="text-xs text-muted-foreground">{fmtR(PRECO_ALMOCO)} por pessoa</p></div>
            <div className="space-y-2 sm:col-span-3 lg:col-span-1"><p className="text-sm">Total do dia <strong className="ml-2 font-mono">{fmtR(preview.total)}</strong></p><Button type="submit" className="w-full" disabled={!loaded || !data || cafes === "" || almocos === ""}><Save />{existente ? "Salvar alterações" : "Salvar quantidades"}</Button></div>
          </form>
        </section>
        <section aria-label="Período" className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-end">
          <div className="space-y-1.5"><label htmlFor="refeicoes-inicio" className="text-xs font-medium">De</label><Input id="refeicoes-inicio" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} /></div>
          <div className="space-y-1.5"><label htmlFor="refeicoes-fim" className="text-xs font-medium">Até</label><Input id="refeicoes-fim" type="date" value={fim} onChange={(e) => setFim(e.target.value)} /></div>
          <Button variant="ghost" onClick={() => { setInicio(""); setFim(""); }}>Todo o histórico</Button>
        </section>
        {intervaloInvalido && <p role="alert" className="text-sm text-destructive">A data inicial deve ser anterior ou igual à data final.</p>}
        <section aria-label="Totais do período" className="grid gap-5 border-y py-5 sm:grid-cols-3">
          <div className="flex gap-3"><Coffee className="mt-1 size-5 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Cafés da manhã · {totais.cafes} unidades</p><p className="font-mono text-2xl font-semibold">{fmtR(totais.valorCafe)}</p></div></div>
          <div className="flex gap-3"><Utensils className="mt-1 size-5 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Almoços · {totais.almocos} unidades</p><p className="font-mono text-2xl font-semibold">{fmtR(totais.valorAlmoco)}</p></div></div>
          <div><p className="text-xs text-muted-foreground">Total do período</p><p className="font-mono text-2xl font-semibold text-primary">{fmtR(totais.total)}</p></div>
        </section>
        <section aria-label="Histórico de refeições" className="space-y-3"><h2 className="text-lg font-semibold">Histórico <span className="font-normal text-muted-foreground">· {linhas.length} dias</span></h2>
          {!loaded ? <p className="py-8 text-muted-foreground">Carregando refeições…</p> : !linhas.length ? <div className="border-y py-12 text-center"><Utensils className="mx-auto mb-3 size-8 text-muted-foreground" /><p className="font-medium">Nenhuma refeição registrada neste período</p></div> : <>
            <div className="hidden overflow-x-auto border-y md:block"><table className="w-full text-sm"><thead className="bg-muted text-left text-xs text-muted-foreground"><tr>{["Data", "Cafés da manhã", "Valor café", "Almoços", "Valor almoço", "Total do dia", ""].map((h) => <th key={h} className="px-3 py-3 font-medium">{h}</th>)}</tr></thead><tbody className="divide-y">{linhas.map((r) => { const t = totalRefeicoes([r]); return <tr key={r.data} className="bg-card"><td className="px-3 py-3 font-mono">{formatarData(r.data)}</td><td className="px-3 py-3">{r.cafes}</td><td className="px-3 py-3 font-mono">{fmtR(t.valorCafe)}</td><td className="px-3 py-3">{r.almocos}</td><td className="px-3 py-3 font-mono">{fmtR(t.valorAlmoco)}</td><td className="px-3 py-3 font-mono font-semibold">{fmtR(t.total)}</td><td className="px-3 py-3">{acoes(r)}</td></tr>; })}</tbody></table></div>
            <div className="space-y-3 md:hidden">{linhas.map((r) => { const t = totalRefeicoes([r]); return <article key={r.data} className="rounded border bg-card p-4"><div className="flex items-center justify-between gap-2"><h3 className="font-mono text-sm font-semibold">{formatarData(r.data)}</h3>{acoes(r)}</div><dl className="mt-3 space-y-2 text-sm"><div className="flex justify-between gap-2"><dt>Café · {r.cafes}</dt><dd className="font-mono">{fmtR(t.valorCafe)}</dd></div><div className="flex justify-between gap-2"><dt>Almoço · {r.almocos}</dt><dd className="font-mono">{fmtR(t.valorAlmoco)}</dd></div><div className="flex justify-between gap-2 border-t pt-2 font-semibold"><dt>Total</dt><dd className="font-mono">{fmtR(t.total)}</dd></div></dl></article>; })}</div>
          </>}
        </section>
      </>}
    </main>
    {excluindo && <Dialog open onOpenChange={(open) => { if (!open) setExcluindo(null); }}><DialogContent><DialogHeader><DialogTitle>Excluir registro de refeições?</DialogTitle><DialogDescription>As quantidades de {formatarData(excluindo.data)} serão removidas. Esta ação não pode ser desfeita.</DialogDescription></DialogHeader><DialogFooter className="gap-2"><Button variant="outline" onClick={() => setExcluindo(null)}>Cancelar</Button><Button variant="destructive" onClick={excluir}><Trash2 />Excluir registro</Button></DialogFooter></DialogContent></Dialog>}
  </div>;
}