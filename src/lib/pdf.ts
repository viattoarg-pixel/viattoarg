import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDate } from "./format";

export type PdfExpense = {
  id: string;
  description: string;
  amount: number;
  expense_date: string;
  receipt_url?: string | null;
  category_name?: string | null;
};

export type PdfBudget = {
  name: string;
  max_amount: number;
  currency: string;
};

export type PdfUser = {
  full_name?: string | null;
  email?: string | null;
};

async function loadReceiptImage(path: string): Promise<{ dataUrl: string; ext: string } | null> {
  try {
    const { data } = await supabase.storage.from("receipts").createSignedUrl(path, 600);
    if (!data?.signedUrl) return null;
    const res = await fetch(data.signedUrl);
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) return null;
    const dataUrl: string = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    const ext = blob.type.includes("png") ? "PNG" : "JPEG";
    return { dataUrl, ext };
  } catch {
    return null;
  }
}

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 16;

async function drawHeader(doc: jsPDF, title: string, subtitle?: string) {
  // Typographic wordmark (dark green serif)
  doc.setFont("times", "normal");
  doc.setFontSize(24);
  doc.setTextColor(28, 64, 48);
  doc.text("viatto", MARGIN, 21);

  // Title block
  doc.setTextColor(20, 30, 45);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, PAGE_W - MARGIN, 18, { align: "right" });
  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(110, 120, 130);
    doc.text(subtitle, PAGE_W - MARGIN, 24, { align: "right" });
  }

  // Divider
  doc.setDrawColor(20, 30, 45);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, 28, PAGE_W - MARGIN, 28);
  doc.setTextColor(20, 20, 20);
  doc.setLineWidth(0.2);
}

function drawUserBlock(doc: jsPDF, user: PdfUser | undefined, yStart: number): number {
  const now = new Date();
  const generated = now.toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  doc.setFontSize(9);
  doc.setTextColor(110, 120, 130);
  doc.setFont("helvetica", "bold");
  doc.text("PREPARADO POR", MARGIN, yStart);
  doc.text("FECHA DE EMISIÓN", PAGE_W - MARGIN, yStart, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setTextColor(20, 30, 45);
  doc.setFontSize(10);
  const name = user?.full_name || "Usuario";
  const email = user?.email || "—";
  doc.text(name, MARGIN, yStart + 5);
  doc.setTextColor(90, 100, 110);
  doc.setFontSize(9);
  doc.text(email, MARGIN, yStart + 10);

  doc.setTextColor(20, 30, 45);
  doc.setFontSize(10);
  doc.text(generated, PAGE_W - MARGIN, yStart + 5, { align: "right" });

  doc.setTextColor(20, 20, 20);
  return yStart + 16;
}

function drawFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(220);
    doc.line(MARGIN, PAGE_H - 14, PAGE_W - MARGIN, PAGE_H - 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(130, 140, 150);
    doc.text("viatto · Reporte de viáticos", MARGIN, PAGE_H - 9);
    doc.text(`Página ${i} de ${pageCount}`, PAGE_W - MARGIN, PAGE_H - 9, { align: "right" });
    doc.setTextColor(20, 20, 20);
  }
}

function drawKeyValueRow(doc: jsPDF, label: string, value: string, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(60, 70, 80);
  doc.text(label, MARGIN, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(20, 30, 45);
  doc.text(value, MARGIN + 45, y);
  doc.setTextColor(20, 20, 20);
}

export async function downloadExpensePdf(expense: PdfExpense, currency = "ARS", user?: PdfUser) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await drawHeader(doc, "Comprobante de gasto", expense.description || undefined);

  let y = drawUserBlock(doc, user, 36);
  y += 4;

  // Boxed details
  doc.setDrawColor(220);
  doc.setFillColor(248, 249, 251);
  doc.roundedRect(MARGIN, y, PAGE_W - MARGIN * 2, 36, 1.5, 1.5, "FD");
  let ry = y + 8;
  drawKeyValueRow(doc, "Nombre", expense.description || "Sin nombre", ry); ry += 7;
  drawKeyValueRow(doc, "Fecha", formatDate(expense.expense_date), ry); ry += 7;
  drawKeyValueRow(doc, "Categoría", expense.category_name ?? "Sin categoría", ry); ry += 7;
  drawKeyValueRow(doc, "Monto", formatCurrency(expense.amount, currency), ry);
  y += 44;

  if (expense.receipt_url) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(60, 70, 80);
    doc.text("Comprobante", MARGIN, y);
    y += 5;
    const img = await loadReceiptImage(expense.receipt_url);
    if (img) {
      try {
        doc.addImage(img.dataUrl, img.ext, MARGIN, y, 120, 0);
      } catch {
        doc.setFont("helvetica", "italic");
        doc.text("(No se pudo incrustar la imagen)", MARGIN, y);
      }
    } else {
      doc.setFont("helvetica", "italic");
      doc.setTextColor(130);
      doc.text("(Comprobante no disponible o no es imagen)", MARGIN, y);
    }
  }

  drawFooter(doc);
  doc.save(`gasto-${(expense.description || expense.id).slice(0, 40)}.pdf`);
}

export async function downloadExpensesReportPdf(opts: {
  budget: PdfBudget | null;
  spent: number;
  remaining: number;
  expenses: PdfExpense[];
  currency: string;
  user?: PdfUser;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await drawHeader(doc, "Reporte de gastos", opts.budget?.name ?? undefined);

  let y = drawUserBlock(doc, opts.user, 36);
  y += 4;

  // Summary box
  if (opts.budget) {
    doc.setDrawColor(220);
    doc.setFillColor(248, 249, 251);
    doc.roundedRect(MARGIN, y, PAGE_W - MARGIN * 2, 30, 1.5, 1.5, "FD");
    let ry = y + 8;
    drawKeyValueRow(doc, "Tope máximo", formatCurrency(opts.budget.max_amount, opts.currency), ry); ry += 7;
    drawKeyValueRow(doc, "Gastado", formatCurrency(opts.spent, opts.currency), ry); ry += 7;
    drawKeyValueRow(doc, "Disponible", formatCurrency(opts.remaining, opts.currency), ry);
    y += 38;
  }

  // Detail header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20, 30, 45);
  doc.text("Detalle de gastos", MARGIN, y);
  y += 3;
  doc.setDrawColor(20, 30, 45);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 6;
  doc.setLineWidth(0.2);

  // Column headers
  doc.setFontSize(8);
  doc.setTextColor(110, 120, 130);
  doc.text("FECHA", MARGIN, y);
  doc.text("DESCRIPCIÓN", MARGIN + 36, y);
  doc.text("CATEGORÍA", MARGIN + 110, y);
  doc.text("MONTO", PAGE_W - MARGIN, y, { align: "right" });
  y += 4;
  doc.setDrawColor(230);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 5;

  doc.setTextColor(20, 30, 45);
  doc.setFontSize(10);

  for (const e of opts.expenses) {
    if (y > PAGE_H - 30) {
      drawFooter(doc);
      doc.addPage();
      await drawHeader(doc, "Reporte de gastos", opts.budget?.name ?? undefined);
      y = 40;
    }
    doc.setFont("helvetica", "normal");
    doc.text(formatDate(e.expense_date), MARGIN, y);
    const desc = doc.splitTextToSize(e.description || "Sin nombre", 68);
    doc.text(desc, MARGIN + 36, y);
    doc.setTextColor(110, 120, 130);
    const cat = doc.splitTextToSize(e.category_name ?? "Sin categoría", 40);
    doc.text(cat, MARGIN + 110, y);
    doc.setTextColor(20, 30, 45);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(e.amount, opts.currency), PAGE_W - MARGIN, y, { align: "right" });
    y += Math.max(5, Math.max(desc.length, cat.length) * 4.5);

    if (e.receipt_url) {
      const img = await loadReceiptImage(e.receipt_url);
      if (img) {
        if (y > PAGE_H - 70) {
          drawFooter(doc);
          doc.addPage();
          await drawHeader(doc, "Reporte de gastos", opts.budget?.name ?? undefined);
          y = 40;
        }
        try {
          doc.addImage(img.dataUrl, img.ext, MARGIN, y, 60, 0);
          y += 50;
        } catch { /* noop */ }
      }
    }
    doc.setDrawColor(238);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y); y += 5;
  }

  // Totals row
  if (y > PAGE_H - 30) { drawFooter(doc); doc.addPage(); y = 30; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20, 30, 45);
  doc.text("Total", MARGIN, y + 4);
  doc.text(formatCurrency(opts.spent, opts.currency), PAGE_W - MARGIN, y + 4, { align: "right" });

  drawFooter(doc);
  doc.save(`gastos-${opts.budget?.name ?? "reporte"}.pdf`);
}
