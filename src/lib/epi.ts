import { ordenarColaboradores, type Colaborador } from "./frequencia";

export function gruposEpi(colaboradores: Colaborador[]) {
  const funcoes = [...new Set(colaboradores.map((c) => c.funcao))].sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
  return funcoes.map((funcao) => ({
    funcao,
    nomes: ordenarColaboradores(colaboradores.filter((c) => c.funcao === funcao)).map((c) => c.nome),
  }));
}

/** Ficha coletiva, com campos preenchidos no papel e sem dados de CPF. */
export async function criarFichasEpi(colaboradores: Colaborador[], funcoes?: string[]): Promise<Blob> {
  const grupos = funcoes ? gruposEpi(colaboradores).filter((g) => funcoes.includes(g.funcao)) : gruposEpi(colaboradores);
  if (!grupos.length) throw new Error("Nenhum colaborador cadastrado para gerar a ficha.");
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  grupos.forEach((grupo, index) => {
    if (index) doc.addPage();
    const funcao = doc.splitTextToSize(`Função: ${grupo.funcao}`, 269);
    const tabelaY = 40 + funcao.length * 5 + 9;
    autoTable(doc, {
      startY: tabelaY,
      head: [["Nome do colaborador", "EPI / equipamento", "Data", "Assinatura do colaborador"]],
      body: grupo.nomes.map((nome) => [nome, "", "", ""]),
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 3, minCellHeight: 16, textColor: 0, lineColor: 140, lineWidth: 0.2, valign: "middle" },
      headStyles: { fillColor: 235, textColor: 0, fontStyle: "bold", minCellHeight: 12 },
      columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 85 }, 2: { cellWidth: 29 }, 3: { cellWidth: 75 } },
      margin: { top: tabelaY, bottom: 23, left: 14, right: 14 },
      rowPageBreak: "avoid",
      didDrawPage: () => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(15);
        doc.text("RJR CONSTRUÇÃO NAVAL", 14, 20);
        doc.setFontSize(12);
        doc.text("FICHA DE RECEBIMENTO DE EPI", 14, 29);
        doc.setFontSize(11);
        doc.text(funcao, 14, 40);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text("Ao assinar, o colaborador confirma o recebimento dos EPIs descritos na sua linha.", 14, 194);
      },
    });
  });
  const total = doc.getNumberOfPages();
  for (let pagina = 1; pagina <= total; pagina++) {
    doc.setPage(pagina);
    doc.setFontSize(8);
    doc.text(`RJR Construção Naval · Recebimento de EPI · ${pagina}/${total}`, 14, 203);
  }
  return doc.output("blob");
}

export async function baixarFichaEpi(blob: Blob) {
  const filename = "recebimento-epi-rjr.pdf";
  const file = new File([blob], filename, { type: "application/pdf" });
  if (matchMedia("(pointer: coarse)").matches && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: "Recebimento de EPI" }); return; }
    catch (error) { if (error instanceof DOMException && error.name === "AbortError") return; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}