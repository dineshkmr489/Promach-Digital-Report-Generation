import { mkdir, writeFile } from "node:fs/promises";
import { serviceReports } from "../app/reportData.ts";
import { buildServiceReportPdf } from "../app/reportPdf.ts";

await mkdir("output/pdf", { recursive: true });
await mkdir("public/generated-reports", { recursive: true });

for (const report of serviceReports) {
  const bytes = Buffer.from(
    buildServiceReportPdf(report).output("arraybuffer"),
  );
  const filename = `Promach-Service-Report-${report.id}.pdf`;
  await writeFile(`output/pdf/${filename}`, bytes);
  await writeFile(`public/generated-reports/${filename}`, bytes);
  process.stdout.write(`${filename}: ${bytes.length} bytes\n`);
}
