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

function header(doc: jsPDF, title: string) {
  doc.setFillColor(90, 122, 74);
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("viatto", 14, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(title, 14, 22);
  doc.setTextColor(20, 20, 20);
}

export async function downloadExpensePdf(expense: PdfExpense, currency = "ARS") {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  header(doc, "Comprobante de gasto");

  let y = 40;
  doc.setFontSize(11);
  const rows: [string, string][] = [
    ["Nombre", expense.description || "Sin nombre"],
    ["Fecha", formatDate(expense.expense_date)],
    ["Categoría", expense.category_name ?? "Sin categoría"],
    ["Monto", formatCurrency(expense.amount, currency)],
  ];
  rows.forEach(([k, v]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${k}:`, 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(v), 50, y);
    y += 8;
  });

  if (expense.receipt_url) {
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.text("Comprobante:", 14, y);
    y += 6;
    const img = await loadReceiptImage(expense.receipt_url);
    if (img) {
      try {
        doc.addImage(img.dataUrl, img.ext, 14, y, 120, 0);
      } catch {
        doc.setFont("helvetica", "italic");
        doc.text("(No se pudo incrustar la imagen)", 14, y);
      }
    } else {
      doc.setFont("helvetica", "italic");
      doc.text("(Comprobante no disponible o no es imagen)", 14, y);
    }
  }

  doc.save(`gasto-${(expense.description || expense.id).slice(0, 40)}.pdf`);
}

export async function downloadExpensesReportPdf(opts: {
  budget: PdfBudget | null;
  spent: number;
  remaining: number;
  expenses: PdfExpense[];
  currency: string;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  header(doc, opts.budget?.name ?? "Reporte de gastos");

  let y = 38;
  doc.setFontSize(11);
  if (opts.budget) {
    doc.setFont("helvetica", "bold"); doc.text("Tope máximo:", 14, y);
    doc.setFont("helvetica", "normal"); doc.text(formatCurrency(opts.budget.max_amount, opts.currency), 55, y); y += 7;
    doc.setFont("helvetica", "bold"); doc.text("Gastado:", 14, y);
    doc.setFont("helvetica", "normal"); doc.text(formatCurrency(opts.spent, opts.currency), 55, y); y += 7;
    doc.setFont("helvetica", "bold"); doc.text("Disponible:", 14, y);
    doc.setFont("helvetica", "normal"); doc.text(formatCurrency(opts.remaining, opts.currency), 55, y); y += 10;
  }

  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text("Detalle de gastos", 14, y); y += 6;
  doc.setFontSize(10);
  doc.setDrawColor(200);
  doc.line(14, y, 196, y); y += 5;

  for (const e of opts.expenses) {
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold");
    doc.text(e.description || "Sin nombre", 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(formatCurrency(e.amount, opts.currency), 196, y, { align: "right" });
    y += 5;
    doc.setTextColor(110);
    doc.text(`${formatDate(e.expense_date)} · ${e.category_name ?? "Sin categoría"}`, 14, y);
    doc.setTextColor(20);
    y += 6;

    if (e.receipt_url) {
      const img = await loadReceiptImage(e.receipt_url);
      if (img) {
        if (y > 200) { doc.addPage(); y = 20; }
        try {
          doc.addImage(img.dataUrl, img.ext, 14, y, 70, 0);
          y += 55;
        } catch { /* noop */ }
      }
    }
    doc.setDrawColor(230);
    doc.line(14, y, 196, y); y += 5;
  }

  doc.save(`gastos-${opts.budget?.name ?? "reporte"}.pdf`);
}
