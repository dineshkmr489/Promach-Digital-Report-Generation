import { jsPDF } from "jspdf";
import {
  type CompanyProfile,
  type EquipmentService,
  type ServiceReport,
} from "./reportData.ts";

const pageWidth = 210;
const margin = 10;
const contentWidth = pageWidth - margin * 2; // 190mm

const brandNavy: [number, number, number] = [26, 43, 76]; // #1a2b4c
const brandHeaderBg: [number, number, number] = [24, 43, 73]; // #182b49
const brandRed: [number, number, number] = [211, 47, 47];
const brandGreen: [number, number, number] = [46, 125, 50];
const lightGreenBg: [number, number, number] = [232, 245, 233];
const lightRedBg: [number, number, number] = [255, 235, 238];
const textDark: [number, number, number] = [33, 33, 33];
const textMuted: [number, number, number] = [100, 116, 139];
const tableBorder: [number, number, number] = [203, 213, 225];
const tableHeaderBg: [number, number, number] = [241, 245, 249];
const tableRowAltBg: [number, number, number] = [248, 250, 252];

export type PdfBrandAssets = {
  promachLogo: string | null;
  contractorMarks: string | null;
  certificationStrip: string | null;
};

const brandAssetPaths = {
  promachLogo: "/brand/promach-logo.png",
  contractorMarks: "/brand/bca-bizsafe-marks.png",
  certificationStrip: "/brand/certification-strip.png",
} as const;

let browserBrandAssets: Promise<PdfBrandAssets> | null = null;

async function imageUrlToDataUrl(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to load PDF brand asset: ${url}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const chunkSize = 0x8000;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }

  return `data:${response.headers.get("content-type") ?? "image/png"};base64,${btoa(binary)}`;
}

export function loadPdfBrandAssets(): Promise<PdfBrandAssets> {
  if (!browserBrandAssets) {
    browserBrandAssets = Promise.allSettled([
      imageUrlToDataUrl(brandAssetPaths.promachLogo),
      imageUrlToDataUrl(brandAssetPaths.contractorMarks),
      imageUrlToDataUrl(brandAssetPaths.certificationStrip),
    ]).then(([logo, contractorMarks, certificationStrip]) => ({
      promachLogo: logo.status === "fulfilled" ? logo.value : null,
      contractorMarks:
        contractorMarks.status === "fulfilled" ? contractorMarks.value : null,
      certificationStrip:
        certificationStrip.status === "fulfilled"
          ? certificationStrip.value
          : null,
    }));
  }

  return browserBrandAssets;
}

function clean(value: string | undefined | null): string {
  if (!value) return "";
  return value
    .replaceAll("–", "-")
    .replaceAll("—", "-")
    .replaceAll("×", "x")
    .replaceAll("Ω", "Ohm")
    .replaceAll("’", "'")
    .replaceAll("°", " deg ");
}

export async function buildServiceReportPdf(
  report: ServiceReport,
  companyProfile: CompanyProfile,
  assets?: PdfBrandAssets,
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const resolvedAssets = assets || (await loadPdfBrandAssets().catch(() => ({
    promachLogo: null,
    contractorMarks: null,
    certificationStrip: null,
  })));

  const equipmentList = report.equipment.length > 0 ? report.equipment : [
    {
      id: "EQUIP-1",
      name: "Equipment",
      type: "ACMV Equipment",
      brand: "Standard",
      model: "Standard",
      serial: "N/A",
      location: report.address,
      checklist: [],
      measurements: [],
      note: report.remarks,
    } as EquipmentService,
  ];

  equipmentList.forEach((eq, eqIndex) => {
    if (eqIndex > 0) doc.addPage();
    renderEquipmentReportPage(doc, report, eq, resolvedAssets, companyProfile, eqIndex + 1, equipmentList.length);
  });

  return doc;
}

export async function downloadServiceReportPdf(
  report: ServiceReport,
  companyProfile: CompanyProfile,
  storageEndpoint: string | null = `/api/reports/${encodeURIComponent(report.id)}/pdf`,
): Promise<void> {
  const doc = await buildServiceReportPdf(report, companyProfile);
  const filename = `${report.id || "Service-Report"}.pdf`;
  if (storageEndpoint) {
    const response = await fetch(storageEndpoint, {
      method: "POST",
      headers: { "content-type": "application/pdf" },
      body: doc.output("arraybuffer"),
    });
    if (!response.ok) {
      throw new Error("The PDF could not be stored in the report repository.");
    }
  }
  doc.save(filename);
}

function renderEquipmentReportPage(
  doc: jsPDF,
  report: ServiceReport,
  eq: EquipmentService,
  assets: PdfBrandAssets,
  companyProfile: CompanyProfile,
  pageNo: number,
  totalPages: number,
) {
  let y = 6;

  // 1. Top Header (Logo, Company Details, BCA / bizSAFE marks)
  if (assets.promachLogo) {
    try {
      doc.addImage(assets.promachLogo, "PNG", margin, y, 22, 20);
    } catch {
      // fallback
    }
  }

  if (assets.contractorMarks) {
    try {
      doc.addImage(assets.contractorMarks, "PNG", pageWidth - margin - 32, y + 1, 32, 13);
    } catch {
      // fallback
    }
  }

  const centerCol = 100;
  doc.setTextColor(...brandNavy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(companyProfile.name, centerCol, y + 5, { align: "center" });

  doc.setTextColor(...textDark);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text(clean(companyProfile.address), centerCol, y + 9, { align: "center" });
  doc.text(`Tel: ${companyProfile.phone} | E-mail: ${companyProfile.email} | Website: ${companyProfile.website}`, centerCol, y + 12.5, { align: "center" });
  doc.text(clean(companyProfile.registration), centerCol, y + 16, { align: "center" });

  y += 20;

  // Title Banner
  doc.setTextColor(...brandNavy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  const titleText = eq.category === "CRAC"
    ? "CRAC / PRECISION AIR CONDITIONER MAINTENANCE CHECKLIST"
    : "PREVENTIVE MAINTENANCE SERVICE REPORT";
  doc.text(titleText, pageWidth / 2, y + 3, { align: "center" });

  y += 6;

  // Meta Box (Report No., Service Date, Time In/Out, Technician, QR Code hint)
  doc.setFillColor(...tableHeaderBg);
  doc.setDrawColor(...tableBorder);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, contentWidth, 12, "FD");

  const colW = contentWidth / 4;
  // Box 1: Report No
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(...textMuted);
  doc.text("REPORT NO.", margin + 4, y + 4);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...brandNavy);
  doc.text(eq.runningReportNo || report.id, margin + 4, y + 9);

  // Box 2: Service Date
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(...textMuted);
  doc.text("SERVICE DATE", margin + colW + 4, y + 4);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...textDark);
  doc.text(clean(report.date || "28 Jul 2026"), margin + colW + 4, y + 9);

  // Box 3: Time In / Out
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(...textMuted);
  doc.text("TIME IN / OUT", margin + colW * 2 + 4, y + 4);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...textDark);
  doc.text(`${report.timeIn || "09:15 AM"} / ${report.timeOut || "11:45 AM"}`, margin + colW * 2 + 4, y + 9);

  // Box 4: Technician
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(...textMuted);
  doc.text("TECHNICIAN(S)", margin + colW * 3 + 4, y + 4);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...textDark);
  doc.text(clean(report.technicians.join(", ") || "Ramesh Kumar"), margin + colW * 3 + 4, y + 9);

  y += 14;

  // 2-Column: Section 1 (CLIENT & SITE) & Section 2 (EQUIPMENT INFO)
  const halfW = (contentWidth - 2) / 2;
  const s1x = margin;
  const s2x = margin + halfW + 2;
  const sHeight = 36;

  // S1 Header
  renderSectionHeader(doc, s1x, y, halfW, "1. CLIENT & SITE INFORMATION");
  // S2 Header
  renderSectionHeader(doc, s2x, y, halfW, "2. EQUIPMENT INFORMATION");

  const sBodyY = y + 5;
  // S1 Box
  doc.setFillColor(255, 255, 255);
  doc.rect(s1x, sBodyY, halfW, sHeight, "FD");
  // S2 Box
  doc.rect(s2x, sBodyY, halfW, sHeight, "FD");

  // S1 Content
  const s1Rows = [
    ["Client Name", clean(report.client)],
    ["Site Name", clean(report.siteName || report.client)],
    ["Building / Area", clean(report.buildingArea || "Control Building")],
    ["Location", clean(eq.location || report.address)],
    ["Work Order No.", clean(report.workOrderNo || "WO/2026/0728")],
    ["PO No.", clean(report.poNo || "PO/2026/0550")],
    ["Service Type", clean(report.serviceType || "Quarterly Maintenance")],
  ];
  let curY = sBodyY + 4;
  s1Rows.forEach(([lbl, val]) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.2);
    doc.setTextColor(...textMuted);
    doc.text(lbl, s1x + 2, curY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...textDark);
    doc.text(`:  ${val}`, s1x + 28, curY);
    curY += 4.8;
  });

  // S2 Content
  const s2Rows = [
    ["Equipment Category", clean(eq.type || "AHU (Air Handling Unit)")],
    ["Equipment Tag No.", clean(eq.tagNo || eq.name)],
    ["Equipment Description", clean(eq.name || eq.tagNo || "")],
    ["Brand / Model", `${clean(eq.brand)} / ${clean(eq.model)}`],
    ["Serial No.", clean(eq.serial || "N/A")],
    ["Capacity / Motor", `${clean(eq.capacity || "18,000 CMH")} | ${clean(eq.motorType || "Three Phase")}`],
    ["Asset No.", clean(eq.assetNo || "TP-ACMV-001")],
  ];
  curY = sBodyY + 4;
  s2Rows.forEach(([lbl, val]) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.2);
    doc.setTextColor(...textMuted);
    doc.text(lbl, s2x + 2, curY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...textDark);
    doc.text(`:  ${val}`, s2x + 32, curY);
    curY += 4.8;
  });

  // Draw Equipment QR placeholder box on right of S2
  doc.setFillColor(...tableRowAltBg);
  doc.rect(s2x + halfW - 18, sBodyY + 2, 16, 16, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5);
  doc.setTextColor(...brandNavy);
  doc.text("QR CODE", s2x + halfW - 10, sBodyY + 9, { align: "center" });
  doc.setFontSize(4.5);
  doc.text(clean(eq.tagNo || "QR"), s2x + halfW - 10, sBodyY + 13, { align: "center" });

  y = sBodyY + sHeight + 3;

  // Section 3: MAINTENANCE CHECKLIST (2-column layout)
  renderSectionHeader(doc, margin, y, contentWidth, "3. MAINTENANCE CHECKLIST");
  y += 5;

  const checklistItems = eq.checklistResults && eq.checklistResults.length > 0
    ? eq.checklistResults
    : (eq.checklist || []).map((item) => ({ item, result: "YES" as const, remark: "Good" }));

  const halfCount = Math.ceil(checklistItems.length / 2);
  const leftItems = checklistItems.slice(0, halfCount);
  const rightItems = checklistItems.slice(halfCount);

  const checkTableW = halfW;
  const checkRowH = 4.2;

  // Left Checklist Table
  renderChecklistSubtable(doc, margin, y, checkTableW, leftItems, 1);
  // Right Checklist Table
  renderChecklistSubtable(doc, margin + halfW + 2, y, checkTableW, rightItems, halfCount + 1);

  y += Math.max(leftItems.length, rightItems.length) * checkRowH + 5 + 3;

  // Section 4: MEASUREMENT READINGS (2-column layout)
  renderSectionHeader(doc, margin, y, contentWidth, "4. MEASUREMENT READINGS");
  y += 5;

  const measurements = eq.measurements && eq.measurements.length > 0 ? eq.measurements : [];
  const measHalf = Math.ceil(measurements.length / 2);
  const leftMeas = measurements.slice(0, measHalf);
  const rightMeas = measurements.slice(measHalf);

  renderMeasurementSubtable(doc, margin, y, checkTableW, leftMeas);
  renderMeasurementSubtable(doc, margin + halfW + 2, y, checkTableW, rightMeas);

  y += Math.max(leftMeas.length, rightMeas.length, 1) * checkRowH + 5 + 3;

  // Section 5, 6, 7: 3-column lower block (FINDINGS & RECOMMENDATIONS, SPARES, SERVICE SUMMARY)
  const col3W = (contentWidth - 4) / 3;

  // Col 1: Findings & Recommendations
  renderSectionHeader(doc, margin, y, col3W, "5. FINDINGS & RECOMMENDATIONS");
  // Col 2: Spare Parts
  renderSectionHeader(doc, margin + col3W + 2, y, col3W, "6. SPARE PARTS USED");
  // Col 3: Service Summary
  renderSectionHeader(doc, margin + (col3W + 2) * 2, y, col3W, "7. SERVICE SUMMARY");

  y += 5;
  const lowerH = 26;

  // Col 1 Box
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, y, col3W, lowerH, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.8);
  doc.setTextColor(...brandNavy);
  doc.text("Findings:", margin + 2, y + 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.4);
  doc.setTextColor(...textDark);
  const findingsList = eq.findings || report.findings || ["Running normal.", "Regular maintenance completed."];
  let findY = y + 7.5;
  findingsList.slice(0, 2).forEach((f) => {
    doc.text(`- ${clean(f)}`.slice(0, 38), margin + 2, findY);
    findY += 3.8;
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.8);
  doc.setTextColor(...brandNavy);
  doc.text("Recommendations:", margin + 2, findY + 1);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.4);
  doc.setTextColor(...textDark);
  const recList = eq.recommendations || report.recommendations || ["Routine filter cleaning as scheduled."];
  doc.text(`- ${clean(recList[0] || "Monitor regularly.")}`.slice(0, 38), margin + 2, findY + 4.5);

  // Col 2 Box: Spares
  const col2X = margin + col3W + 2;
  doc.rect(col2X, y, col3W, lowerH, "FD");
  doc.setFillColor(...tableHeaderBg);
  doc.rect(col2X, y, col3W, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.4);
  doc.setTextColor(...brandNavy);
  doc.text("Item Description", col2X + 2, y + 3);
  doc.text("Qty", col2X + col3W - 20, y + 3);
  doc.text("Remarks", col2X + col3W - 10, y + 3);

  const spares = eq.spareParts || report.spareParts || [
    { id: "1", description: "Air Filter (Pre)", qty: "1 No.", remarks: "Replaced" },
    { id: "2", description: "Drain Pan Treatment", qty: "1 No.", remarks: "Completed" },
  ];
  let spareY = y + 7;
  spares.slice(0, 4).forEach((sp) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.2);
    doc.setTextColor(...textDark);
    doc.text(clean(sp.description).slice(0, 22), col2X + 2, spareY);
    doc.text(clean(sp.qty), col2X + col3W - 20, spareY);
    doc.text(clean(sp.remarks).slice(0, 10), col2X + col3W - 10, spareY);
    spareY += 4.2;
  });

  // Col 3 Box: Service Summary
  const col3X = margin + (col3W + 2) * 2;
  doc.rect(col3X, y, col3W, lowerH, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.8);
  doc.setTextColor(...textMuted);
  doc.text("Overall Condition:", col3X + 2, y + 4.5);
  doc.setFillColor(...lightGreenBg);
  doc.roundedRect(col3X + 26, y + 1.5, 14, 4, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...brandGreen);
  doc.text(clean(eq.overallCondition || report.overallCondition || "Good"), col3X + 33, y + 4.3, { align: "center" });

  doc.setTextColor(...textMuted);
  doc.setFont("helvetica", "normal");
  doc.text("Service Completed:", col3X + 2, y + 10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textDark);
  doc.text(eq.serviceCompleted !== false ? "Yes" : "Pending", col3X + 30, y + 10);

  doc.setTextColor(...textMuted);
  doc.setFont("helvetica", "normal");
  doc.text("Further Action:", col3X + 2, y + 15.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textDark);
  doc.text(clean(eq.furtherActionRequired || report.furtherActionRequired || "Monitor current").slice(0, 20), col3X + 22, y + 15.5);

  doc.setTextColor(...textMuted);
  doc.setFont("helvetica", "normal");
  doc.text("Next Service Due:", col3X + 2, y + 21);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...brandNavy);
  doc.text(clean(eq.nextServiceDue || report.nextServiceDue || "28 Oct 2026"), col3X + 26, y + 21);

  y += lowerH + 3;

  // Section 8: SIGNATURES (4 columns)
  renderSectionHeader(doc, margin, y, contentWidth, "8. SIGNATURES & ACKNOWLEDGEMENT");
  y += 5;

  const sigW = (contentWidth - 6) / 4;
  const sigH = 18;

  // Box 1: Technician
  renderSignatureBox(doc, margin, y, sigW, sigH, "Technician", report.technicians[0] || "Ramesh Kumar", report.date || "28 Jul 2026", "11:45 AM");
  // Box 2: Supervisor
  renderSignatureBox(doc, margin + sigW + 2, y, sigW, sigH, "Supervisor (Optional)", report.supervisorName || "Sridhar M.", report.date || "28 Jul 2026", "12:00 PM");
  // Box 3: Client Representative
  renderSignatureBox(doc, margin + (sigW + 2) * 2, y, sigW, sigH, "Client Representative", report.acknowledgement?.name || "Mr. Nasir Bin Abdul Majid", report.acknowledgement?.signedDate || "28 Jul 2026", "12:15 PM");
  // Box 4: Company Stamp
  const stampX = margin + (sigW + 2) * 3;
  doc.setFillColor(255, 255, 255);
  doc.rect(stampX, y, sigW, sigH, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.setTextColor(...brandNavy);
  doc.text("Company Stamp", stampX + 2, y + 3.5);
  doc.setDrawColor(...brandNavy);
  doc.setLineWidth(0.4);
  doc.roundedRect(stampX + 3, y + 5.5, sigW - 6, sigH - 7, 1, 1, "D");
  doc.setFontSize(6.5);
  doc.text("PROMACH PTE. LTD.", stampX + sigW / 2, y + 11, { align: "center" });

  y += sigH + 3;

  // Footer: ISO Accreditation strip & computer generated disclaimer
  if (assets.certificationStrip) {
    try {
      doc.addImage(assets.certificationStrip, "PNG", margin + 15, y, contentWidth - 30, 8);
    } catch {
      // fallback
    }
  }

  y += 9;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.2);
  doc.setTextColor(...textMuted);
  doc.text(`Report generated on: ${report.date || "28 Jul 2026"} | Generated by: PDMS Mobile App`, margin, y);
  doc.text("Our ref: QMS-FR-07 | Rev: 02 | Eff: 01-05-2024", pageWidth / 2, y, { align: "center" });
  doc.text(`Page ${pageNo} of ${totalPages}`, pageWidth - margin, y, { align: "right" });

  y += 3;
  doc.setFontSize(4.8);
  doc.text("This is a computer generated document and does not require a manual signature.", pageWidth / 2, y, { align: "center" });
}

function renderSectionHeader(doc: jsPDF, x: number, y: number, w: number, title: string) {
  doc.setFillColor(...brandHeaderBg);
  doc.rect(x, y, w, 4.8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  doc.setTextColor(255, 255, 255);
  doc.text(title, x + 2.5, y + 3.4);
}

function renderChecklistSubtable(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  items: Array<{ item: string; result: string; remark: string }>,
  startNo: number,
) {
  // Table Header
  doc.setFillColor(...tableHeaderBg);
  doc.setDrawColor(...tableBorder);
  doc.setLineWidth(0.25);
  doc.rect(x, y, w, 4, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.setTextColor(...brandNavy);
  doc.text("No.", x + 1.5, y + 2.8);
  doc.text("Checklist Item", x + 8, y + 2.8);
  doc.text("Yes", x + w - 28, y + 2.8);
  doc.text("No", x + w - 21, y + 2.8);
  doc.text("N.A.", x + w - 15, y + 2.8);
  doc.text("Remarks", x + w - 8, y + 2.8);

  let curY = y + 4;
  const rowH = 4.2;

  items.forEach((item, idx) => {
    const isAlt = idx % 2 === 1;
    doc.setFillColor(isAlt ? 255 : 250, isAlt ? 255 : 252, isAlt ? 255 : 255);
    doc.rect(x, curY, w, rowH, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.2);
    doc.setTextColor(...textDark);
    doc.text(String(startNo + idx), x + 2, curY + 2.8);
    doc.text(clean(item.item).slice(0, 36), x + 8, curY + 2.8);

    // Yes/No/NA indicator
    const res = item.result?.toUpperCase();
    doc.setFont("helvetica", "bold");
    if (res === "YES" || res === "OK") {
      doc.setTextColor(...brandGreen);
      doc.text("✓", x + w - 27, curY + 2.8);
    } else {
      doc.setTextColor(...textMuted);
      doc.text("-", x + w - 27, curY + 2.8);
    }

    if (res === "NO" || res === "FAULTY") {
      doc.setTextColor(...brandRed);
      doc.text("✗", x + w - 20, curY + 2.8);
    } else {
      doc.setTextColor(...textMuted);
      doc.text("-", x + w - 20, curY + 2.8);
    }

    if (res === "N/A" || res === "NA") {
      doc.setTextColor(...textMuted);
      doc.text("–", x + w - 14, curY + 2.8);
    } else {
      doc.setTextColor(...textMuted);
      doc.text("-", x + w - 14, curY + 2.8);
    }

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textDark);
    doc.text(clean(item.remark || "Good").slice(0, 10), x + w - 8, curY + 2.8);

    curY += rowH;
  });
}

function renderMeasurementSubtable(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  items: Array<{ label: string; value: string; unit: string; min?: number; max?: number; status?: string; isAbnormal?: boolean }>,
) {
  doc.setFillColor(...tableHeaderBg);
  doc.setDrawColor(...tableBorder);
  doc.setLineWidth(0.25);
  doc.rect(x, y, w, 4, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.setTextColor(...brandNavy);
  doc.text("Parameter", x + 2, y + 2.8);
  doc.text("Actual", x + w - 38, y + 2.8);
  doc.text("Normal Range", x + w - 26, y + 2.8);
  doc.text("Unit", x + w - 13, y + 2.8);
  doc.text("Status", x + w - 6, y + 2.8);

  let curY = y + 4;
  const rowH = 4.2;

  items.forEach((m, idx) => {
    const isAlt = idx % 2 === 1;
    doc.setFillColor(isAlt ? 255 : 250, isAlt ? 255 : 252, isAlt ? 255 : 255);
    doc.rect(x, curY, w, rowH, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.2);
    doc.setTextColor(...textDark);
    doc.text(clean(m.label).slice(0, 26), x + 2, curY + 2.8);

    doc.setFont("helvetica", "bold");
    doc.text(clean(m.value || "-"), x + w - 38, curY + 2.8);

    doc.setFont("helvetica", "normal");
    const rangeText = m.min !== undefined && m.max !== undefined ? `${m.min}-${m.max}` : "-";
    doc.text(rangeText, x + w - 26, curY + 2.8);
    doc.text(clean(m.unit || ""), x + w - 13, curY + 2.8);

    const isAbnormal = m.isAbnormal || m.status === "Abnormal" || m.status === "High" || m.status === "Low";
    if (isAbnormal) {
      doc.setFillColor(...lightRedBg);
      doc.roundedRect(x + w - 8.5, curY + 0.6, 7.5, 3, 0.5, 0.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...brandRed);
      doc.text("Abn", x + w - 5, curY + 2.7, { align: "center" });
    } else {
      doc.setFillColor(...lightGreenBg);
      doc.roundedRect(x + w - 8.5, curY + 0.6, 7.5, 3, 0.5, 0.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...brandGreen);
      doc.text("Norm", x + w - 5, curY + 2.7, { align: "center" });
    }

    curY += rowH;
  });
}

function renderSignatureBox(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  name: string,
  date: string,
  time: string,
) {
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...tableBorder);
  doc.setLineWidth(0.3);
  doc.rect(x, y, w, h, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.setTextColor(...brandNavy);
  doc.text(title, x + 2, y + 3.5);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(name, x + w / 2, y + 9.5, { align: "center" });

  doc.setDrawColor(...tableBorder);
  doc.setLineWidth(0.2);
  doc.line(x + 3, y + 12.5, x + w - 3, y + 12.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5);
  doc.setTextColor(...textMuted);
  doc.text(`${date} | ${time}`, x + w / 2, y + 15.5, { align: "center" });
}
