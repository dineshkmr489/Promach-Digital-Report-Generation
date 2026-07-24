import { jsPDF } from "jspdf";
import {
  company,
  type EquipmentService,
  type ServiceReport,
} from "./reportData.ts";

const pageWidth = 210;
const pageHeight = 297;
const margin = 14;
const contentBottom = pageHeight - 18;
const contentWidth = pageWidth - margin * 2; // 182mm

const forest: [number, number, number] = [18, 56, 46]; // #12382e
const green: [number, number, number] = [35, 110, 82]; // #236e52
const lime: [number, number, number] = [217, 242, 95]; // #d9f25f
const ink: [number, number, number] = [24, 53, 46]; // #18352e
const muted: [number, number, number] = [96, 116, 109]; // #60746d
const line: [number, number, number] = [218, 227, 222]; // #dae3de
const soft: [number, number, number] = [246, 249, 247]; // #f6f9f7
const borderSoft: [number, number, number] = [228, 235, 231];
const amber: [number, number, number] = [180, 100, 10]; // #b4640a
const amberBg: [number, number, number] = [254, 248, 238];
const amberLine: [number, number, number] = [243, 210, 162];

function clean(value: string): string {
  if (!value) return "";
  return value
    .replaceAll("–", "-")
    .replaceAll("—", "-")
    .replaceAll("×", "x")
    .replaceAll("Ω", "Ohm")
    .replaceAll("’", "'")
    .replaceAll("°", " deg ");
}

function signedTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return clean(value);
  return new Intl.DateTimeFormat("en-SG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Singapore",
    timeZoneName: "short",
  }).format(parsed);
}

function addPageHeader(doc: jsPDF, report: ServiceReport) {
  // Top accent bar
  doc.setFillColor(...lime);
  doc.rect(0, 0, pageWidth, 1.8, "F");

  // Main banner
  doc.setFillColor(...forest);
  doc.rect(0, 1.8, pageWidth, 31.2, "F");

  // Logo container
  doc.setFillColor(...lime);
  doc.roundedRect(margin, 7.5, 17, 17, 3, 3, "F");
  doc.setTextColor(...forest);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("P", margin + 8.5, 19.5, { align: "center" });

  // Company Information
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12.5);
  doc.setFont("helvetica", "bold");
  doc.text(company.name, margin + 22, 13.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(220, 235, 230);
  doc.text(clean(company.address), margin + 22, 18.2);
  doc.text(
    `${company.phone}   |   ${company.email}   |   ${company.website}`,
    margin + 22,
    22.4,
  );
  doc.setFontSize(6.8);
  doc.setTextColor(175, 202, 194);
  doc.text(company.registration, margin + 22, 26.4);

  // Document Title & Number
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(220, 235, 230);
  doc.text("SERVICE REPORT / DELIVERY ORDER", pageWidth - margin, 13, {
    align: "right",
  });
  doc.setTextColor(...lime);
  doc.setFontSize(17);
  doc.text(`#${report.id}`, pageWidth - margin, 23, { align: "right" });
}

function addFooter(doc: jsPDF, report: ServiceReport) {
  const pages = doc.getNumberOfPages();
  const dateStr = new Date().toLocaleDateString("en-SG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...line);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13);

    doc.setTextColor(...muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(
      `Promach DSR  |  Report ${report.id}  |  Generated ${dateStr}`,
      margin,
      pageHeight - 7.5,
    );
    doc.text(`Page ${page} of ${pages}`, pageWidth - margin, pageHeight - 7.5, {
      align: "right",
    });
  }
}

function sectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFillColor(...forest);
  doc.roundedRect(margin, y, contentWidth, 7.5, 1.5, 1.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(clean(title).toUpperCase(), margin + 4, y + 5.1);
  return y + 11.5;
}

function ensureSpace(
  doc: jsPDF,
  report: ServiceReport,
  y: number,
  needed: number,
): number {
  if (y + needed <= contentBottom) return y;
  doc.addPage();
  addPageHeader(doc, report);
  return 38;
}

function renderLabelValue(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
): number {
  doc.setTextColor(...muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.text(label.toUpperCase(), x, y);

  doc.setTextColor(...ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.8);
  const lines = doc.splitTextToSize(clean(value), width);
  doc.text(lines, x, y + 4.8);
  return lines.length * 4.2 + 5.2;
}

function addEquipment(
  doc: jsPDF,
  report: ServiceReport,
  equipment: EquipmentService,
  startY: number,
): number {
  // Estimate height needed for header + specs card + initial checklist items
  const estChecklistHeight = Math.min(equipment.checklist.length, 3) * 8.5;
  const initialNeeded = 38 + estChecklistHeight;
  let y = ensureSpace(doc, report, startY, initialNeeded);

  y = sectionTitle(doc, `${equipment.name} - ${equipment.type}`, y);

  // Specs card column widths: Brand(32mm), Model(42mm), Serial(42mm), Location(54mm)
  const colX = [
    margin + 4,
    margin + 38,
    margin + 82,
    margin + 126,
  ];
  const colW = [32, 42, 42, 50];

  const brandLines = doc.splitTextToSize(clean(equipment.brand), colW[0]);
  const modelLines = doc.splitTextToSize(clean(equipment.model), colW[1]);
  const serialLines = doc.splitTextToSize(clean(equipment.serial), colW[2]);
  const locLines = doc.splitTextToSize(clean(equipment.location), colW[3]);

  const maxLines = Math.max(
    brandLines.length,
    modelLines.length,
    serialLines.length,
    locLines.length,
  );
  const cardHeight = Math.max(16, maxLines * 4.2 + 9);

  doc.setFillColor(...soft);
  doc.setDrawColor(...borderSoft);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, cardHeight, 2, 2, "FD");

  renderLabelValue(doc, "Brand", equipment.brand, colX[0], y + 5, colW[0]);
  renderLabelValue(doc, "Model", equipment.model, colX[1], y + 5, colW[1]);
  renderLabelValue(doc, "Serial", equipment.serial, colX[2], y + 5, colW[2]);
  renderLabelValue(doc, "Location", equipment.location, colX[3], y + 5, colW[3]);

  y += cardHeight + 4.5;

  // Checklist section header
  y = ensureSpace(doc, report, y, 14);
  doc.setTextColor(...ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.2);
  doc.text("Checklist results", margin, y);
  y += 4.5;

  for (const [itemIndex, item] of equipment.checklist.entries()) {
    const result = equipment.checklistResults?.[itemIndex]?.result ?? "YES";
    const textWidth = contentWidth - 23; // 159mm
    const lines = doc.splitTextToSize(clean(item), textWidth);
    const rowHeight = Math.max(7.2, lines.length * 3.8 + 3.2);

    y = ensureSpace(doc, report, y, rowHeight + 2);

    // Row card
    doc.setFillColor(...soft);
    doc.setDrawColor(...borderSoft);
    doc.setLineWidth(0.25);
    doc.roundedRect(margin, y, contentWidth, rowHeight, 1.5, 1.5, "FD");

    // "YES" Badge - fixed compact pill height (5.2mm) perfectly centered vertically
    const badgeW = 14;
    const badgeH = 5.2;
    const badgeY = y + (rowHeight - badgeH) / 2;

    const resultColor = result === "YES" ? green : result === "NO" ? amber : muted;
    doc.setFillColor(...resultColor);
    doc.roundedRect(margin + 2.5, badgeY, badgeW, badgeH, 1.2, 1.2, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.text(result, margin + 2.5 + badgeW / 2, badgeY + 3.6, {
      align: "center",
    });

    // Item text
    doc.setTextColor(...ink);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.8);
    const textY = y + (rowHeight - lines.length * 3.6) / 2 + 2.8;
    doc.text(lines, margin + 20, textY);

    y += rowHeight + 2;
  }

  // Measurements section
  if (equipment.measurements.length > 0) {
    const rows = Math.ceil(equipment.measurements.length / 3);
    const needed = 8 + rows * 16.5;
    y = ensureSpace(doc, report, y + 2, needed);

    doc.setTextColor(...ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.2);
    doc.text("Measurements", margin, y);
    y += 4.5;

    const cardW = (contentWidth - 6) / 3; // ~58.6mm per card
    const cardH = 14;

    equipment.measurements.forEach((m, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const cardX = margin + col * (cardW + 3);
      const cardY = y + row * (cardH + 2.5);

      doc.setFillColor(...soft);
      doc.setDrawColor(...borderSoft);
      doc.setLineWidth(0.25);
      doc.roundedRect(cardX, cardY, cardW, cardH, 1.5, 1.5, "FD");

      doc.setTextColor(...muted);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.text(clean(m.label).toUpperCase(), cardX + 3.5, cardY + 4.6);

      doc.setTextColor(...ink);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.8);
      const valStr = clean(`${m.value}${m.unit ? ` ${m.unit}` : ""}`);
      doc.text(valStr, cardX + 3.5, cardY + 10.4);
    });

    y += Math.ceil(equipment.measurements.length / 3) * 16.5 + 2;
  }

  // Equipment note banner
  if (equipment.note) {
    const isWarn = equipment.note.toLowerCase().includes("chemical") || equipment.note.toLowerCase().includes("dirty");
    const noteColor = isWarn ? amber : green;
    const noteBg = isWarn ? amberBg : soft;
    const noteBorder = isWarn ? amberLine : borderSoft;

    const lines = doc.splitTextToSize(
      `Equipment note: ${clean(equipment.note)}`,
      contentWidth - 8,
    );
    const bannerH = Math.max(9, lines.length * 4.0 + 4.5);

    y = ensureSpace(doc, report, y + 1, bannerH + 3);

    doc.setFillColor(...noteBg);
    doc.setDrawColor(...noteBorder);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentWidth, bannerH, 1.5, 1.5, "FD");

    doc.setTextColor(...noteColor);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(lines, margin + 4, y + 5.2);

    y += bannerH + 4;
  }

  return y + 2;
}

export function buildServiceReportPdf(report: ServiceReport): jsPDF {
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
  let y = 37;

  // Header Details Card
  const col1X = margin + 4;
  const col2X = margin + 88;
  const col3X = margin + 136;

  const col1W = 78;
  const col2W = 44;
  const col3W = 42;

  const clientLines = doc.splitTextToSize(clean(report.client), col1W);
  const addrLines = doc.splitTextToSize(clean(report.address), col1W);

  const row1H = Math.max(13, clientLines.length * 4.2 + 6);
  const row2H = Math.max(13, addrLines.length * 4.2 + 6);
  const infoCardH = row1H + row2H + 4;

  doc.setFillColor(...soft);
  doc.setDrawColor(...borderSoft);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, infoCardH, 2.5, 2.5, "FD");

  // Row 1
  renderLabelValue(doc, "Customer", report.client, col1X, y + 5, col1W);
  renderLabelValue(doc, "Report date", report.date, col2X, y + 5, col2W);
  renderLabelValue(doc, "Status", report.status, col3X, y + 5, col3W);

  // Row 2
  const row2Y = y + row1H + 2;
  renderLabelValue(doc, "Address / service location", report.address, col1X, row2Y, col1W);
  renderLabelValue(doc, "Service month", report.serviceMonth, col2X, row2Y, col2W);
  renderLabelValue(doc, "Service type", report.serviceType, col3X, row2Y, col3W);

  y += infoCardH + 5;

  // Service Summary Section
  y = sectionTitle(doc, "Service summary", y);
  doc.setTextColor(...ink);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  const summaryLines = doc.splitTextToSize(clean(report.summary), contentWidth);
  doc.text(summaryLines, margin, y);
  y += summaryLines.length * 4.0 + 4;

  // Work performed
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.2);
  doc.text("Work performed", margin, y);
  y += 4.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  for (const item of report.workPerformed) {
    const lines = doc.splitTextToSize(`-  ${clean(item)}`, contentWidth);
    y = ensureSpace(doc, report, y, lines.length * 4.0 + 1);
    doc.text(lines, margin, y);
    y += lines.length * 4.0 + 1;
  }
  y += 5;

  // Equipment Sections
  for (const eq of report.equipment) {
    y = addEquipment(doc, report, eq, y);
  }

  // Completion and Acknowledgement
  y = ensureSpace(doc, report, y, 68);
  y = sectionTitle(doc, "Completion and acknowledgement", y);

  const ackCardH = 26;
  doc.setFillColor(...soft);
  doc.setDrawColor(...borderSoft);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, ackCardH, 2, 2, "FD");

  renderLabelValue(
    doc,
    "Completed by",
    report.technicians.join(", "),
    col1X,
    y + 5,
    78,
  );
  renderLabelValue(
    doc,
    "Acknowledged by",
    report.acknowledgement.name,
    col2X,
    y + 5,
    88,
  );
  renderLabelValue(
    doc,
    "Customer designation",
    report.acknowledgement.designation,
    col2X,
    y + 16,
    52,
  );
  renderLabelValue(
    doc,
    "Signed date",
    report.acknowledgement.signedDate,
    col3X,
    y + 16,
    42,
  );

  y += ackCardH + 5;

  if (report.signature) {
    const signature = report.signature;
    const signatureHeight = signature.dataUrl ? 36 : 23;
    y = ensureSpace(doc, report, y, signatureHeight + 7);
    doc.setFillColor(249, 251, 250);
    doc.setDrawColor(...borderSoft);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentWidth, signatureHeight, 2, 2, "FD");

    if (signature.dataUrl) {
      try {
        doc.addImage(signature.dataUrl, "PNG", margin + 4, y + 4, 62, 21);
      } catch {
        doc.setTextColor(...muted);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7);
        doc.text("Digital signature image unavailable", margin + 4, y + 14);
      }
    }

    const metaX = signature.dataUrl ? margin + 72 : margin + 4;
    renderLabelValue(
      doc,
      "Digital signer",
      signature.signerName,
      metaX,
      y + 6,
      signature.dataUrl ? 48 : 76,
    );
    renderLabelValue(
      doc,
      "Signing channel",
      signature.channel === "client_portal"
        ? "Secure client link"
        : signature.channel === "admin_device"
          ? "Promach admin device"
          : "Original source document",
      metaX + (signature.dataUrl ? 52 : 82),
      y + 6,
      48,
    );
    renderLabelValue(
      doc,
      "Signed timestamp",
      signedTime(signature.signedAt),
      metaX,
      y + (signature.dataUrl ? 19 : 17),
      76,
    );
    y += signatureHeight + 5;
  }

  // Remarks
  y = ensureSpace(doc, report, y, 22);
  doc.setTextColor(...ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.2);
  doc.text("Remarks", margin, y);
  y += 4.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  const remarksLines = doc.splitTextToSize(clean(report.remarks), contentWidth);
  doc.text(remarksLines, margin, y);
  y += remarksLines.length * 4.0 + 4;

  // Follow-Up Banner
  if (report.followUp && report.followUp !== "No follow-up recorded.") {
    const followUpLines = doc.splitTextToSize(
      `FOLLOW-UP: ${clean(report.followUp)}`,
      contentWidth - 8,
    );
    const followH = Math.max(10, followUpLines.length * 4.2 + 5);

    y = ensureSpace(doc, report, y, followH + 4);

    doc.setFillColor(...amberBg);
    doc.setDrawColor(...amberLine);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentWidth, followH, 2, 2, "FD");

    doc.setTextColor(...amber);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(followUpLines, margin + 4, y + 5.8);

    y += followH + 5;
  }

  // Source Transcription Review
  if (report.transcriptionNotes && report.transcriptionNotes.length > 0) {
    y = ensureSpace(doc, report, y, 25);

    doc.setTextColor(...ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.2);
    doc.text("Source transcription review", margin, y);
    y += 4.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(...muted);

    for (const item of report.transcriptionNotes) {
      const lines = doc.splitTextToSize(`-  ${clean(item)}`, contentWidth);
      y = ensureSpace(doc, report, y, lines.length * 3.8 + 1);
      doc.text(lines, margin, y);
      y += lines.length * 3.8 + 1;
    }
  }

  addFooter(doc, report);
  return doc;
}

export function downloadServiceReportPdf(report: ServiceReport) {
  const doc = buildServiceReportPdf(report);
  doc.save(`Promach-Service-Report-${report.id}.pdf`);
}
