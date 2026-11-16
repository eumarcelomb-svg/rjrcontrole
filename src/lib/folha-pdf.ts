import { fmtH, fmtR } from "./frequencia";
import type { ItemFolha } from "./folha";
import type { Fechamento } from "./folha-nuvem";

const br = (data: string) => data.split("-").reverse().join("/");
export const ordenarItensFolha = (itens: ItemFolha[]) => [...itens].sort((a, b) => a.nome.trim().localeCompare(b.nome.trim(), "pt-BR", { sensitivity: "base" }));
export type DetalheExtraFolha = { periodo: string; descricao: string; horas: number; pct: number; valor: number };

/** Usa somente o fechamento salvo, nunca a frequência ou os salários atuais. */
export function detalhesExtrasFolha(item: ItemFolha): DetalheExtraFolha[] {
  const linhas: DetalheExtraFolha[] = [];
  const preco50 = item.e50 > 0 ? item.v50 / item.e50 : 0;
  const preco100 = item.e100 > 0 ? item.v100 / item.e100 : 0;
  for (const e of [...(item.extrasDias ?? [])].sort((a, b) => a.data.localeCompare(b.data))) {
    linhas.push({ periodo: br(e.data), descricao: "Extra registrada na frequência", horas: e.horas, pct: e.pct, valor: e.valor });
  }
  for (const a of [...(item.ajustes ?? [])].sort((a, b) => a.periodo_inicio.localeCompare(b.periodo_inicio))) {
    for (const [horas, pct, preco] of [[a.horas50, item.pct50 ?? 50, preco50], [a.horas100, item.pct100 ?? 100, preco100]]) {
      if (horas !== undefined && pct !== undefined && preco !== undefined && horas > 0) linhas.push({ periodo: `${br(a.periodo_inicio)} a ${br(a.periodo_fim)}`, descricao: `Ajuste anterior: ${a.motivo}`, horas, pct, valor: horas * preco });
    }
  }
  // Fechamentos antigos não guardavam datas diárias. Preserve seus totais sem inventar datas.
  if (item.extrasDias === undefined) {
    const h50 = Math.max(0, item.e50 - (item.ajustes ?? []).reduce((t, a) => t + a.horas50, 0));
    const h100 = Math.max(0, item.e100 - (item.ajustes ?? []).reduce((t, a) => t + a.horas100, 0));
    if (h50 > 0) linhas.unshift({ periodo: "Período da folha", descricao: "Extra registrada (datas não salvas neste fechamento)", horas: h50, pct: item.pct50 ?? 50, valor: h50 * preco50 });
    if (h100 > 0) linhas.unshift({ periodo: "Período da folha", descricao: "Extra registrada (datas não salvas neste fechamento)", horas: h100, pct: item.pct100 ?? 100, valor: h100 * preco100 });
  }
  return linhas;
}

export async function criarPdfFolha(fechamento: Fechamento, colaboradorId?: string): Promise<Blob> {
  const itens = ordenarItensFolha(fechamento.itens).filter((i) => !colaboradorId || i.colaborador_id === colaboradorId);
  if (!itens.length) throw new Error("Nenhum colaborador neste fechamento.");
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const individual = !!colaboradorId;
  const doc = new jsPDF({ orientation: individual ? "portrait" : "landscape", unit: "mm", format: "a4" });
  const largura = doc.internal.pageSize.getWidth();
  const altura = doc.internal.pageSize.getHeight();
  const titulo = individual ? "DEMONSTRATIVO INDIVIDUAL DE PAGAMENTO" : "FOLHA DE PAGAMENTO FECHADA";
  const cabecalho = () => {
    doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.text("RJR CONSTRUÇÃO NAVAL", 14, 17);
    doc.setFontSize(11); doc.text(titulo, 14, 25);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text(`Pagamento: ${br(fechamento.data_pagamento)}   |   Período: ${br(fechamento.periodo_inicio)} a ${br(fechamento.periodo_fim)}`, 14, 33);
  };
  const comum = {
    theme: "grid" as const,
    styles: { font: "helvetica", fontSize: 9, cellPadding: 3, textColor: 0, lineColor: 180, lineWidth: 0.15, overflow: "linebreak" as const },
    headStyles: { fillColor: 235, textColor: 0, fontStyle: "bold" as const },
    footStyles: { fillColor: 235, textColor: 0, fontStyle: "bold" as const },
    margin: { top: 41, bottom: 19, left: 14, right: 14 },
    rowPageBreak: "avoid" as const,
    didDrawPage: cabecalho,
  };
  if (!individual) {
    autoTable(doc, { ...comum, startY: 41,
      head: [["Colaborador / função", "Base salarial", "Extras 50%", "Extras 100%", "Faltas", "Total a receber"]],
      body: itens.map((i) => [`${i.nome}\n${i.funcao}`, fmtR(i.base), `${fmtH(i.e50)}\n${fmtR(i.v50)}`, `${fmtH(i.e100)}\n${fmtR(i.v100)}`, String(i.faltas), fmtR(i.total)]),
      foot: [[`${itens.length} colaboradores · Total da folha`, "", "", "", "", fmtR(Number(fechamento.total))]],
      showFoot: "lastPage", columnStyles: { 0: { cellWidth: 93 }, 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "center" }, 5: { halign: "right" } },
    });
  }
  if (!individual) {
    const linhas = itens.flatMap((i) => detalhesExtrasFolha(i).map((e) => [i.nome, e.periodo, e.descricao, fmtH(e.horas), `${e.pct}%`, fmtR(e.valor)]));
    if (linhas.length) {
      doc.addPage();
      autoTable(doc, { ...comum, startY: 41,
        head: [["Colaborador", "Data / período", "Descrição das extras", "Horas", "Adicional", "Valor"]],
        body: linhas, columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 48 }, 3: { cellWidth: 20 }, 4: { cellWidth: 22 }, 5: { cellWidth: 29, halign: "right" } },
      });
    }
  }
  for (const i of individual ? itens : []) {
    cabecalho();
    doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    const nome = doc.splitTextToSize(i.nome, largura - 28) as string[];
    doc.text(nome, 14, 44);
    const y = 44 + nome.length * 5;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    const funcao = doc.splitTextToSize(`Função: ${i.funcao}`, largura - 28) as string[];
    doc.text(funcao, 14, y);
    autoTable(doc, { ...comum, startY: y + funcao.length * 4 + 5,
      head: [["Descrição", "Horas / quantidade", "Valor"]],
      body: [["Base salarial da quinzena", "", fmtR(i.base)], ["Horas extras 50%", fmtH(i.e50), fmtR(i.v50)], ["Horas extras 100%", fmtH(i.e100), fmtR(i.v100)], ["Faltas (sem desconto automático)", String(i.faltas), "—"]],
      foot: [["Total a receber", "", fmtR(i.total)]], showFoot: "lastPage", columnStyles: { 2: { halign: "right" } },
    });
    let fim = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
    if (fim + 28 > altura - 19) { doc.addPage(); cabecalho(); fim = 41; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.text("DESCRIÇÃO DAS HORAS EXTRAS", 14, fim + 10);
    const extras = detalhesExtrasFolha(i);
    autoTable(doc, { ...comum, startY: fim + 14,
      head: [["Data / período", "Descrição", "Horas", "Adicional", "Valor"]],
      body: extras.length ? extras.map((e) => [e.periodo, e.descricao, fmtH(e.horas), `${e.pct}%`, fmtR(e.valor)]) : [["—", "Sem horas extras neste fechamento", "0:00", "—", fmtR(0)]],
      columnStyles: { 0: { cellWidth: individual ? 40 : 48 }, 2: { cellWidth: 20 }, 3: { cellWidth: 22 }, 4: { cellWidth: 29, halign: "right" } },
    });
  }
  for (let p = 1; p <= doc.getNumberOfPages(); p++) {
    doc.setPage(p); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.text("Valores do fechamento salvo · Não comprova pagamento", 14, altura - 10);
    doc.text(`${p}/${doc.getNumberOfPages()}`, largura - 14, altura - 10, { align: "right" });
  }
  return doc.output("blob");
}

export async function baixarPdfFolha(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: "application/pdf" });
  if (matchMedia("(pointer: coarse)").matches && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: "Folha de pagamento RJR" }); return; }
    catch (e) { if (e instanceof DOMException && e.name === "AbortError") return; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}