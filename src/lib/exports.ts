import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import * as XLSX from "xlsx";
import { StockItem } from "@/types/stock";

export interface CompanyExportProfile {
  company_name: string;
  company_subtitle: string;
  company_address: string;
  company_email: string;
  company_phone: string;
  logo_url?: string | null;
  currency: string;
}

async function imageUrlToDataUrl(imageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;
    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Failed to read logo blob"));
      reader.readAsDataURL(blob);
    });
    return dataUrl;
  } catch (error) {
    console.error("Error loading company logo for PDF:", error);
    return null;
  }
}

function formatCurrency(value: number | null, currency: string) {
  if (value === null) return "-";
  return new Intl.NumberFormat("fr-DZ", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(value);
}

function productToRecord(item: StockItem, currency: string) {
  const total = (item.price_ht || 0) * item.quantity;
  const remainingPayment = Math.max(0, total - (item.paid_amount || 0));

  return {
    Numero: item.number,
    Description: item.description,
    Reference: item.reference || "",
    Quantite: item.quantity,
    Reserve: item.reserved,
    Restant: item.remaining,
    PrixHT: item.price_ht ?? "",
    Total: total,
    Versement: item.paid_amount || 0,
    ResteAPayer: remainingPayment,
    ClientNom: item.client?.name || "",
    ClientEmail: item.client?.email || "",
    Marque: item.brand?.name || "",
    Origine: item.origin?.name || "",
    Notes: item.notes || "",
    Devise: currency,
  };
}

export function exportProductsToExcel(items: StockItem[], currency: string) {
  const data = items.map((item) => productToRecord(item, currency));
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Produits");

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
  });

  const stamp = new Date().toISOString().slice(0, 10);
  saveAs(blob, `produits-${stamp}.xlsx`);
}

export async function exportProductToPdf(item: StockItem, company: CompanyExportProfile, extraText: string) {
  const doc = new jsPDF();
  const total = (item.price_ht || 0) * item.quantity;
  const remainingPayment = Math.max(0, total - (item.paid_amount || 0));
  const currency = company.currency;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 36, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.text(company.company_name || "Fiche Produit", 14, 14);
  doc.setFontSize(10);
  doc.text(company.company_subtitle || "", 14, 20);
  doc.text([company.company_address, company.company_email, company.company_phone].filter(Boolean).join(" • "), 14, 26);

  if (company.logo_url) {
    const logoDataUrl = await imageUrlToDataUrl(company.logo_url);
    if (logoDataUrl) {
      try {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(172, 6, 30, 24, 2, 2, "F");
        doc.addImage(logoDataUrl, "PNG", 174, 8, 26, 20, undefined, "FAST");
      } catch (error) {
        console.error("Error drawing company logo in PDF:", error);
      }
    }
  }

  doc.setTextColor(17, 24, 39);
  doc.setFontSize(14);
  doc.text(`Fiche Produit #${item.number}`, 14, 48);
  doc.setFontSize(10);
  doc.text(`Date d'édition: ${new Date().toLocaleDateString("fr-FR")}`, 14, 54);

  doc.setDrawColor(203, 213, 225);
  doc.line(14, 58, 196, 58);

  doc.setFontSize(11);
  const lines = [
    `Description: ${item.description}`,
    `Reference: ${item.reference || "-"}`,
    `Quantite: ${item.quantity}`,
    `Reserve: ${item.reserved}`,
    `Restant: ${item.remaining}`,
    `Prix HT: ${formatCurrency(item.price_ht, currency)}`,
    `Total: ${formatCurrency(total, currency)}`,
    `Versement: ${formatCurrency(item.paid_amount || 0, currency)}`,
    `Reste a payer: ${formatCurrency(remainingPayment, currency)}`,
    `Client: ${item.client?.name || "-"} ${item.client?.email ? `(${item.client.email})` : ""}`,
    `Marque: ${item.brand?.name || "-"}`,
    `Origine: ${item.origin?.name || "-"}`,
    `Notes: ${item.notes || "-"}`,
  ];

  let cursorY = 66;
  lines.forEach((line) => {
    doc.text(line, 14, cursorY);
    cursorY += 7;
  });

  if (extraText.trim()) {
    cursorY += 6;
    doc.setFontSize(12);
    doc.text("Cahier des charges / Observations:", 14, cursorY);
    cursorY += 8;
    doc.setFontSize(11);
    const wrapped = doc.splitTextToSize(extraText, 180);
    doc.text(wrapped, 14, cursorY);
  }

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`${company.company_name} - Document généré automatiquement`, 14, 288);

  const safeName = item.description.replace(/[^a-zA-Z0-9-_ ]/g, "").trim() || `produit-${item.number}`;
  doc.save(`${safeName}.pdf`);
}

export async function exportProductToDoc(item: StockItem, company: CompanyExportProfile, extraText: string) {
  const total = (item.price_ht || 0) * item.quantity;
  const remainingPayment = Math.max(0, total - (item.paid_amount || 0));
  const currency = company.currency;

  const rows = [
    `Description: ${item.description}`,
    `Reference: ${item.reference || "-"}`,
    `Quantite: ${item.quantity}`,
    `Reserve: ${item.reserved}`,
    `Restant: ${item.remaining}`,
    `Prix HT: ${formatCurrency(item.price_ht, currency)}`,
    `Total: ${formatCurrency(total, currency)}`,
    `Versement: ${formatCurrency(item.paid_amount || 0, currency)}`,
    `Reste a payer: ${formatCurrency(remainingPayment, currency)}`,
    `Client: ${item.client?.name || "-"} ${item.client?.email ? `(${item.client.email})` : ""}`,
    `Marque: ${item.brand?.name || "-"}`,
    `Origine: ${item.origin?.name || "-"}`,
    `Notes: ${item.notes || "-"}`,
  ];

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.LEFT,
            children: [new TextRun({ text: company.company_name || "Fiche Produit", bold: true, size: 34 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: company.company_subtitle || "", italics: true, size: 24 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: [company.company_address, company.company_email, company.company_phone].filter(Boolean).join(" • "), size: 20 })],
          }),
          new Paragraph({
            spacing: { after: 240 },
            children: [new TextRun({ text: `Fiche Produit #${item.number} — ${new Date().toLocaleDateString("fr-FR")}`, bold: true, size: 28 })],
          }),
          ...rows.map((line) =>
            new Paragraph({
              spacing: { after: 80 },
              children: [new TextRun({ text: line, size: 24 })],
            }),
          ),
          new Paragraph({
            children: [new TextRun({ text: " " })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "Cahier des charges / Observations", bold: true, size: 28 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: extraText || "-", size: 24 })],
          }),
          new Paragraph({
            spacing: { before: 280 },
            children: [new TextRun({ text: `${company.company_name} - Document généré automatiquement`, italics: true, size: 18 })],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const safeName = item.description.replace(/[^a-zA-Z0-9-_ ]/g, "").trim() || `produit-${item.number}`;
  saveAs(blob, `${safeName}.docx`);
}
