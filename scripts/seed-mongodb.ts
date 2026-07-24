import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ensureDatabase, readWorkspace } from "../server/database.ts";
import {
  closeMongoConnection,
  pingMongoDatabase,
} from "../server/mongodb.ts";

async function loadLocalEnvironment(): Promise<void> {
  try {
    const contents = await readFile(resolve(".env.local"), "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
      if (!match || process.env[match[1]] !== undefined) continue;
      let value = match[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[match[1]] = value;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

await loadLocalEnvironment();

try {
  await pingMongoDatabase();
  await ensureDatabase();
  const workspace = await readWorkspace();
  process.stdout.write(
    [
      `MongoDB database: ${process.env.MONGODB_DB || "report_gen"}`,
      `Clients: ${workspace.clients.length}`,
      `Sites: ${workspace.locations.length}`,
      `Equipment: ${workspace.equipment.length}`,
      `Checklists: ${workspace.checklistTemplates.length}`,
      `Technicians: ${workspace.technicians.length}`,
      `Service types: ${workspace.serviceTypes.length}`,
      `Service reports: ${workspace.reports.length}`,
    ].join("\n") + "\n",
  );
} finally {
  await closeMongoConnection();
}
