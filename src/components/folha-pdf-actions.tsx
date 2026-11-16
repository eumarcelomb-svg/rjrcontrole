import { useState } from "react";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { baixarPdfFolha, criarPdfFolha, ordenarItensFolha } from "@/lib/folha-pdf";
import type { Fechamento } from "@/lib/folha-nuvem";

export function FolhaPdfActions({ fechamento }: { fechamento: Fechamento }) {
  const [colaborador, setColaborador] = useState("");
  const [pdf, setPdf] = useState<Blob | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const itens = ordenarItensFolha(fechamento.itens);
  async function gerar() {
    setOcupado(true); setPdf(null);
    try { setPdf(await criarPdfFolha(fechamento, colaborador || undefined)); }
    catch (e) { toast.error((e as Error).message || "Não foi possível gerar o PDF."); }
    finally { setOcupado(false); }
  }
  const nome = itens.find((i) => i.colaborador_id === colaborador)?.nome ?? "";
  const arquivo = colaborador ? `pagamento-rjr-${fechamento.data_pagamento}-${nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-")}.pdf` : `folha-rjr-${fechamento.data_pagamento}.pdf`;
  return <section className="space-y-2 border-y py-3">
    <label className="block space-y-1 text-sm font-medium">PDF da folha fechada
      <select aria-label="Colaboradores do PDF" className="block h-9 w-full rounded-md border bg-background px-2 text-sm" disabled={ocupado} value={colaborador} onChange={(e) => { setColaborador(e.target.value); setPdf(null); }}>
        <option value="">Todos os colaboradores · folha completa</option>
        {itens.map((i) => <option key={i.colaborador_id} value={i.colaborador_id}>{i.nome}</option>)}
      </select>
    </label>
    <div className="flex flex-wrap items-center gap-2">
      {pdf ? <Button onClick={() => void baixarPdfFolha(pdf, arquivo).catch(() => toast.error("Não foi possível baixar o PDF."))}><Download />{colaborador ? "Baixar PDF individual" : "Baixar PDF da folha"}</Button>
        : <Button disabled={ocupado || !itens.length} onClick={gerar}><FileText />{ocupado ? "Gerando PDF…" : colaborador ? "Gerar PDF individual" : "Gerar PDF da folha"}</Button>}
      {pdf && <span role="status" className="text-sm text-muted-foreground">PDF pronto.</span>}
    </div>
  </section>;
}