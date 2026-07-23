import { jsPDF } from "jspdf";
import {
  company,
  type EquipmentService,
  type ServiceReport,
} from "./reportData.ts";

const pageWidth = 210;
const pageHeight = 297;
const margin = 14;
const contentBottom = pageHeight - 21;
const contentWidth = pageWidth - margin * 2;
const forest: [number, number, number] = [18, 56, 46];
const green: [number, number, number] = [43, 122, 87];
const lime: [number, number, number] = [217, 242, 95];
const ink: [number, number, number] = [24, 53, 46];
const muted: [number, number, number] = [96, 116, 109];
const line: [number, number, number] = [218, 227, 222];
const soft: [number, number, number] = [244, 248, 246];
const amber: [number, number, number] = [178, 109, 18];

function clean(value: string) {
  return value
    .replaceAll("–", "-")
    .replaceAll("—", "-")
    .replaceAll("×", "x")
    .replaceAll("Ω", "Ohm")
    .replaceAll("’", "'");
}

function addPageHeader(doc: jsPDF, report: ServiceReport) {
  doc.setFillColor(...forest);
  doc.rect(0, 0, pageWidth, 34, "F");
  doc.setFillColor(...lime);
  doc.roundedRect(margin, 8, 16, 16, 4, 4, "F");
  doc.setTextColor(...forest);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("P", margin + 8, 19, { align: "center" });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.text(company.name, margin + 21, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.3);
  doc.text(clean(company.address), margin + 21, 18);
  doc.text(
    `${company.phone}  |  ${company.email}  |  ${company.website}`,
    margin + 21,
    22,
  );
  doc.text(company.registration, margin + 21, 26);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("SERVICE REPORT / DELIVERY ORDER", pageWidth - margin, 12, {
    align: "right",
  });
  doc.setTextColor(...lime);
  doc.setFontSize(18);
  doc.text(`#${report.id}`, pageWidth - margin, 22, { align: "right" });
}

function addFooter(doc: jsPDF, report: ServiceReport) {
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...line);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.setTextColor(...muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(
      `Promach DSR  |  Report ${report.id}  |  Generated ${new Date().toLocaleDateString("en-SG")}`,
      margin,
      pageHeight - 7,
    );
    doc.text(`Page ${page} of ${pages}`, pageWidth - margin, pageHeight - 7, {
      align: "right",
    });
  }
}

function labelValue(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
) {
  doc.setTextColor(...muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(label.toUpperCase(), x, y);
  doc.setTextColor(...ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  const lines = doc.splitTextToSize(clean(value), width);
  doc.text(lines, x, y + 5);
}

function sectionTitle(doc: jsPDF, title: string, y: number) {
  doc.setFillColor(...forest);
  doc.roundedRect(margin, y, contentWidth, 8, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(clean(title).toUpperCase(), margin + 4, y + 5.4);
  return y + 12;
}

function ensureSpace(
  doc: jsPDF,
  report: ServiceReport,
  y: number,
  needed: number,
) {
  if (y + needed <= contentBottom) return y;
  doc.addPage();
  addPageHeader(doc, report);
  return 42;
}

function addEquipment(
  doc: jsPDF,
  report: ServiceReport,
  equipment: EquipmentService,
  startY: number,
) {
  let y = ensureSpace(doc, report, startY, 54);
  y = sectionTitle(doc, `${equipment.name} - ${equipment.type}`, y);

  doc.setFillColor(...soft);
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, "F");
  const columnWidth = contentWidth / 4;
  labelValue(doc, "Brand", equipment.brand, margin + 3, y + 5, columnWidth - 6);
  labelValue(
    doc,
    "Model",
    equipment.model,
    margin + columnWidth + 3,
    y + 5,
    columnWidth - 6,
  );
  labelValue(
    doc,
    "Serial",
    equipment.serial,
    margin + columnWidth * 2 + 3,
    y + 5,
    columnWidth - 6,
  );
  labelValue(
    doc,
    "Location",
    equipment.location,
    margin + columnWidth * 3 + 3,
    y + 5,
    columnWidth - 6,
  );
  y += 28;

  doc.setTextColor(...ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Checklist results", margin, y);
  y += 4;

  for (const item of equipment.checklist) {
    const text = doc.splitTextToSize(clean(item), contentWidth - 22);
    const rowHeight = Math.max(7, text.length * 4.1 + 2);
    y = ensureSpace(doc, report, y, rowHeight + 5);
    doc.setFillColor(...soft);
    doc.roundedRect(margin, y, contentWidth, rowHeight, 1.5, 1.5, "F");
    doc.setFillColor(...green);
    doc.roundedRect(margin + 2, y + 1.5, 15, rowHeight - 3, 1.5, 1.5, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.text("YES", margin + 9.5, y + rowHeight / 2 + 2.1, {
      align: "center",
    });
    doc.setTextColor(...ink);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.8);
    doc.text(text, margin + 20, y + 4.7);
    y += rowHeight + 2;
  }

  if (equipment.measurements.length) {
    const measurementRows = Math.ceil(equipment.measurements.length / 3);
    const measurementBlockHeight = 7 + measurementRows * 18;
    y = ensureSpace(doc, report, y + 3, measurementBlockHeight);
    doc.setTextColor(...ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Measurements", margin, y);
    y += 4;
    const measurementWidth = contentWidth / Math.min(3, equipment.measurements.length);
    equipment.measurements.forEach((measurement, index) => {
      const column = index % 3;
      if (index > 0 && column === 0) y += 18;
      const x = margin + column * measurementWidth;
      doc.setDrawColor(...line);
      doc.roundedRect(x, y, measurementWidth - 3, 15, 1.5, 1.5);
      doc.setTextColor(...muted);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.text(clean(measurement.label), x + 3, y + 5);
      doc.setTextColor(...ink);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(
        clean(`${measurement.value}${measurement.unit ? ` ${measurement.unit}` : ""}`),
        x + 3,
        y + 11,
      );
    });
    y += 19;
  }

  y = ensureSpace(doc, report, y, 16);
  const noteColor = equipment.note.toLowerCase().includes("chemical")
    ? amber
    : green;
  doc.setDrawColor(...noteColor);
  doc.setFillColor(...soft);
  doc.roundedRect(margin, y, contentWidth, 11, 2, 2, "FD");
  doc.setTextColor(...noteColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text(`Equipment note: ${clean(equipment.note)}`, margin + 4, y + 7);
  return y + 16;
}

export function buildServiceReportPdf(report: ServiceReport) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: false,
  });

  doc.setProperties({
    title: `Promach Service Report ${report.id}`,
    subject: `${report.client} - ${report.date}`,
    author: company.name,
    creator: "Promach Digital Service Reports",
  });

  addPageHeader(doc, report);
  let y = 42;

  doc.setFillColor(...soft);
  doc.roundedRect(margin, y, contentWidth, 34, 3, 3, "F");
  labelValue(doc, "Customer", report.client, margin + 4, y + 6, 76);
  labelValue(doc, "Report date", report.date, margin + 94, y + 6, 38);
  labelValue(doc, "Status", report.status, margin + 140, y + 6, 35);
  labelValue(doc, "Address / service location", report.address, margin + 4, y + 20, 91);
  labelValue(doc, "Service month", report.serviceMonth, margin + 99, y + 20, 38);
  labelValue(doc, "Service type", report.serviceType, margin + 140, y + 20, 38);
  y += 41;

  y = sectionTitle(doc, "Service summary", y);
  doc.setTextColor(...ink);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const summary = doc.splitTextToSize(clean(report.summary), contentWidth);
  doc.text(summary, margin, y);
  y += summary.length * 4.3 + 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Work performed", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  for (const item of report.workPerformed) {
    const lines = doc.splitTextToSize(`- ${clean(item)}`, contentWidth);
    doc.text(lines, margin, y);
    y += lines.length * 4.2 + 1;
  }
  y += 4;

  for (const equipment of report.equipment) {
    y = addEquipment(doc, report, equipment, y);
  }

  y = ensureSpace(doc, report, y, 72);
  y = sectionTitle(doc, "Completion and acknowledgement", y);
  doc.setFillColor(...soft);
  doc.roundedRect(margin, y, contentWidth, 26, 2, 2, "F");
  labelValue(
    doc,
    "Completed by",
    report.technicians.join(", "),
    margin + 4,
    y + 6,
    80,
  );
  labelValue(
    doc,
    "Acknowledged by",
    report.acknowledgement.name,
    margin + 96,
    y + 6,
    82,
  );
  labelValue(
    doc,
    "Customer designation",
    report.acknowledgement.designation,
    margin + 96,
    y + 18,
    58,
  );
  labelValue(
    doc,
    "Signed date",
    report.acknowledgement.signedDate,
    margin + 158,
    y + 18,
    20,
  );
  y += 32;

  doc.setTextColor(...ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Remarks", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const remarks = doc.splitTextToSize(clean(report.remarks), contentWidth);
  doc.text(remarks, margin, y);
  y += remarks.length * 4.2 + 5;

  if (report.followUp !== "No follow-up recorded.") {
    doc.setFillColor(255, 245, 225);
    doc.setDrawColor(...amber);
    doc.roundedRect(margin, y, contentWidth, 14, 2, 2, "FD");
    doc.setTextColor(...amber);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(`FOLLOW-UP: ${clean(report.followUp)}`, margin + 4, y + 8.5);
    y += 20;
  }

  y = ensureSpace(doc, report, y, 38);
  doc.setTextColor(...ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Source transcription review", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.3);
  for (const item of report.transcriptionNotes) {
    const lines = doc.splitTextToSize(`- ${clean(item)}`, contentWidth);
    doc.text(lines, margin, y);
    y += lines.length * 3.8 + 1;
  }

  addFooter(doc, report);
  return doc;
}

export function downloadServiceReportPdf(report: ServiceReport) {
  const doc = buildServiceReportPdf(report);
  doc.save(`Promach-Service-Report-${report.id}.pdf`);
}
