import { mkdir, readFile, writeFile } from "node:fs/promises";
import { serviceReports } from "../app/reportData.ts";
import {
  buildServiceReportPdf,
  type PdfBrandAssets,
} from "../app/reportPdf.ts";

await mkdir("output/pdf", { recursive: true });
await mkdir("public/generated-reports", { recursive: true });

async function pngDataUrl(path: string): Promise<string> {
  const bytes = await readFile(path);
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

const brandAssets: PdfBrandAssets = {
  promachLogo: await pngDataUrl("public/brand/promach-logo.png"),
  contractorMarks: await pngDataUrl("public/brand/bca-bizsafe-marks.png"),
  certificationStrip: await pngDataUrl(
    "public/brand/certification-strip.png",
  ),
};

for (const report of serviceReports) {
  const doc = await buildServiceReportPdf(report, brandAssets);
  const bytes = Buffer.from(doc.output("arraybuffer"));
  const filename = `Promach-Service-Report-${report.id}.pdf`;
  await writeFile(`output/pdf/${filename}`, bytes);
  await writeFile(`public/generated-reports/${filename}`, bytes);
  process.stdout.write(`${filename}: ${bytes.length} bytes\n`);
}
