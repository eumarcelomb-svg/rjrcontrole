import { fmtCpf, ordenarColaboradores, type Colaborador } from "./frequencia";

/** Uma ficha A4 por colaborador, com os itens de entrega preenchidos no papel. */
export async function criarFichasEpi(colaboradores: Colaborador[]): Promise<Blob> {
  if (!colaboradores.length) throw new Error("Selecione um colaborador para gerar a ficha.");
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  ordenarColaboradores(colaboradores).forEach((c, index) => {
    if (index) doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("RJR CONSTRUÇÃO NAVAL", 14, 20);
    doc.setFontSize(12);
    doc.text("FICHA DE RECEBIMENTO DE EPI", 14, 29);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const nome = doc.splitTextToSize(`Colaborador: ${c.nome}`, 182);
    doc.text(nome, 14, 41);
    const cpfY = 41 + nome.length * 5;
    doc.text(`CPF: ${fmtCpf(c.cpf)}`, 14, cpfY);
    const funcao = doc.splitTextToSize(`Função: ${c.funcao}`, 182);
    doc.text(funcao, 14, cpfY + 7);
    const tabelaY = cpfY + 7 + funcao.length * 5 + 8;
    autoTable(doc, {
      startY: tabelaY,
      head: [["Data", "Equipamento / descrição", "CA", "Qtd.", "Assinatura do colaborador"]],
      body: Array.from({ length: 10 }, () => ["", "", "", "", ""]),
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 2, minCellHeight: 10, textColor: 0, lineColor: 140, lineWidth: 0.2 },
      headStyles: { fillColor: 235, textColor: 0, fontStyle: "bold", minCellHeight: 12 },
      columnStyles: { 0: { cellWidth: 23 }, 1: { cellWidth: 62 }, 2: { cellWidth: 22 }, 3: { cellWidth: 13 }, 4: { cellWidth: 62 } },
      margin: { left: 14, right: 14 },
    });
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
    const y = finalY + 10;
    doc.setFontSize(10);
    doc.text(doc.splitTextToSize("Declaro que recebi os equipamentos de proteção individual relacionados e assinados nesta ficha.", 182), 14, y);
    doc.text("Local: __________________________________   Data: ____/____/________", 14, y + 20);
    doc.line(14, y + 40, 99, y + 40);
    doc.line(111, y + 40, 196, y + 40);
    doc.setFontSize(9);
    doc.text("Assinatura do colaborador", 14, y + 46);
    doc.text("Responsável pela entrega", 111, y + 46);
    doc.setFontSize(8);
    doc.text(`RJR Construção Naval · Recebimento de EPI · ${index + 1}/${colaboradores.length}`, 14, 285);
  });
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