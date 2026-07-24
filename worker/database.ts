import { company } from "../app/reportData";
import { createInitialWorkspace } from "../app/workspaceSeed";
import type {
  AuditEvent,
  ChecklistTemplateRecord,
  ClientRecord,
  DigitalSignature,
  EquipmentRecord,
  LocationRecord,
  ServiceTypeRecord,
  TechnicianRecord,
  WorkspaceReport,
  WorkspaceSnapshot,
} from "../app/workspaceTypes";

export interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  meta?: Record<string, unknown>;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}

export interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact_name TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS locations (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id)
  )`,
  `CREATE TABLE IF NOT EXISTS checklist_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    equipment_type TEXT NOT NULL,
    items_json TEXT NOT NULL,
    measurements_json TEXT NOT NULL DEFAULT '[]',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS equipment (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    location_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    brand TEXT NOT NULL DEFAULT '',
    model TEXT NOT NULL DEFAULT '',
    serial TEXT NOT NULL DEFAULT '',
    checklist_template_id TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (location_id) REFERENCES locations(id),
    FOREIGN KEY (checklist_template_id) REFERENCES checklist_templates(id)
  )`,
  `CREATE TABLE IF NOT EXISTS technicians (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    designation TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS service_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS service_reports (
    report_no TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    location_id TEXT NOT NULL,
    client_name_snapshot TEXT NOT NULL,
    address_snapshot TEXT NOT NULL,
    service_date TEXT NOT NULL,
    service_month TEXT NOT NULL,
    service_type TEXT NOT NULL,
    status TEXT NOT NULL,
    condition TEXT NOT NULL,
    summary TEXT NOT NULL,
    work_performed_json TEXT NOT NULL,
    equipment_json TEXT NOT NULL,
    technician_ids_json TEXT NOT NULL,
    technicians_json TEXT NOT NULL,
    remarks TEXT NOT NULL DEFAULT '',
    follow_up TEXT NOT NULL DEFAULT '',
    acknowledgement_json TEXT NOT NULL,
    source_document_json TEXT,
    transcription_notes_json TEXT NOT NULL DEFAULT '[]',
    share_token_hash TEXT,
    sent_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (location_id) REFERENCES locations(id)
  )`,
  `CREATE TABLE IF NOT EXISTS report_signatures (
    id TEXT PRIMARY KEY,
    report_no TEXT NOT NULL UNIQUE,
    signer_name TEXT NOT NULL,
    signer_email TEXT NOT NULL DEFAULT '',
    designation TEXT NOT NULL DEFAULT '',
    signed_at TEXT NOT NULL,
    channel TEXT NOT NULL,
    signature_data_url TEXT,
    consent_text TEXT NOT NULL,
    FOREIGN KEY (report_no) REFERENCES service_reports(report_no)
  )`,
  `CREATE TABLE IF NOT EXISTS audit_events (
    id TEXT PRIMARY KEY,
    report_no TEXT NOT NULL,
    action TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    channel TEXT NOT NULL,
    detail TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_no) REFERENCES service_reports(report_no)
  )`,
  `CREATE INDEX IF NOT EXISTS locations_client_idx ON locations(client_id)`,
  `CREATE INDEX IF NOT EXISTS equipment_client_location_idx ON equipment(client_id, location_id)`,
  `CREATE INDEX IF NOT EXISTS reports_status_idx ON service_reports(status)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS reports_share_token_idx ON service_reports(share_token_hash) WHERE share_token_hash IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS audit_report_idx ON audit_events(report_no, created_at)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS service_types_name_idx ON service_types(name)`,
];

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function text(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

function bool(value: unknown): boolean {
  return Number(value) === 1;
}

function formatDisplayDate(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-SG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export async function ensureDatabase(db: D1Database): Promise<void> {
  await db.batch(schemaStatements.map((statement) => db.prepare(statement)));
  const checklistColumns = await db
    .prepare("PRAGMA table_info(checklist_templates)")
    .all<{ name: string }>();
  if (
    !(checklistColumns.results ?? []).some(
      (column) => column.name === "measurements_json",
    )
  ) {
    await db
      .prepare(
        "ALTER TABLE checklist_templates ADD COLUMN measurements_json TEXT NOT NULL DEFAULT '[]'",
      )
      .run();
  }
  const count = await db
    .prepare("SELECT COUNT(*) AS count FROM clients")
    .first<{ count: number }>();
  if (Number(count?.count ?? 0) > 0) {
    await backfillSeedMeasurements(db);
    await backfillServiceTypes(db);
    return;
  }
  await seedDatabase(db);
}

async function backfillSeedMeasurements(db: D1Database): Promise<void> {
  const templates = createInitialWorkspace().checklistTemplates.filter(
    (template) => template.measurements.length > 0,
  );
  await db.batch(
    templates.map((template) =>
      db
        .prepare(
          "UPDATE checklist_templates SET measurements_json = ? WHERE id = ? AND measurements_json = '[]'",
        )
        .bind(JSON.stringify(template.measurements), template.id),
    ),
  );
}

async function backfillServiceTypes(db: D1Database): Promise<void> {
  const count = await db
    .prepare("SELECT COUNT(*) AS count FROM service_types")
    .first<{ count: number }>();
  if (Number(count?.count ?? 0) > 0) return;
  await db.batch(
    createInitialWorkspace().serviceTypes.map((item) =>
      db
        .prepare(
          "INSERT INTO service_types (id, name, description, active) VALUES (?, ?, ?, ?)",
        )
        .bind(item.id, item.name, item.description, item.active ? 1 : 0),
    ),
  );
}

async function seedDatabase(db: D1Database): Promise<void> {
  const workspace = createInitialWorkspace();
  const statements: D1PreparedStatement[] = [];

  for (const item of workspace.clients) {
    statements.push(
      db
        .prepare(
          "INSERT INTO clients (id, name, contact_name, email, phone, address, active) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(
          item.id,
          item.name,
          item.contactName,
          item.email,
          item.phone,
          item.address,
          item.active ? 1 : 0,
        ),
    );
  }
  for (const item of workspace.locations) {
    statements.push(
      db
        .prepare(
          "INSERT INTO locations (id, client_id, name, address, active) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(
          item.id,
          item.clientId,
          item.name,
          item.address,
          item.active ? 1 : 0,
        ),
    );
  }
  for (const item of workspace.checklistTemplates) {
    statements.push(
      db
        .prepare(
          "INSERT INTO checklist_templates (id, name, equipment_type, items_json, measurements_json, active) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(
          item.id,
          item.name,
          item.equipmentType,
          JSON.stringify(item.items),
          JSON.stringify(item.measurements),
          item.active ? 1 : 0,
        ),
    );
  }
  for (const item of workspace.equipment) {
    statements.push(
      db
        .prepare(
          "INSERT INTO equipment (id, client_id, location_id, name, type, brand, model, serial, checklist_template_id, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(
          item.id,
          item.clientId,
          item.locationId,
          item.name,
          item.type,
          item.brand,
          item.model,
          item.serial,
          item.checklistTemplateId,
          item.active ? 1 : 0,
        ),
    );
  }
  for (const item of workspace.technicians) {
    statements.push(
      db
        .prepare(
          "INSERT INTO technicians (id, name, designation, email, phone, active) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(
          item.id,
          item.name,
          item.designation,
          item.email,
          item.phone,
          item.active ? 1 : 0,
        ),
    );
  }
  for (const item of workspace.serviceTypes) {
    statements.push(
      db
        .prepare(
          "INSERT INTO service_types (id, name, description, active) VALUES (?, ?, ?, ?)",
        )
        .bind(item.id, item.name, item.description, item.active ? 1 : 0),
    );
  }
  for (const report of workspace.reports) {
    statements.push(reportInsert(db, report));
    if (report.signature) {
      statements.push(
        db
          .prepare(
            "INSERT INTO report_signatures (id, report_no, signer_name, signer_email, designation, signed_at, channel, signature_data_url, consent_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          )
          .bind(
            `signature-${report.id}`,
            report.id,
            report.signature.signerName,
            report.signature.signerEmail,
            report.signature.designation,
            report.signature.signedAt,
            report.signature.channel,
            report.signature.dataUrl,
            report.signature.consentText,
          ),
      );
    }
    for (const event of report.auditTrail) {
      statements.push(
        db
          .prepare(
            "INSERT INTO audit_events (id, report_no, action, actor_name, channel, detail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          )
          .bind(
            event.id,
            report.id,
            event.action,
            event.actorName,
            event.channel,
            event.detail,
            event.createdAt,
          ),
      );
    }
  }

  await db.batch(statements);
}

function reportInsert(
  db: D1Database,
  report: WorkspaceReport,
): D1PreparedStatement {
  return db
    .prepare(
      `INSERT INTO service_reports (
        report_no, client_id, location_id, client_name_snapshot, address_snapshot,
        service_date, service_month, service_type, status, condition, summary,
        work_performed_json, equipment_json, technician_ids_json, technicians_json,
        remarks, follow_up, acknowledgement_json, source_document_json,
        transcription_notes_json, sent_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      report.id,
      report.clientId,
      report.locationId,
      report.client,
      report.address,
      sourceServiceDate(report.date),
      report.serviceMonth,
      report.serviceType,
      report.status,
      report.condition,
      report.summary,
      JSON.stringify(report.workPerformed),
      JSON.stringify(report.equipment),
      JSON.stringify(report.technicianIds),
      JSON.stringify(report.technicians),
      report.remarks,
      report.followUp,
      JSON.stringify(report.acknowledgement),
      report.sourceDocument ? JSON.stringify(report.sourceDocument) : null,
      JSON.stringify(report.transcriptionNotes),
      report.sentAt,
      report.createdAt,
      report.createdAt,
    );
}

function sourceServiceDate(displayDate: string): string {
  const parsed = new Date(`${displayDate} UTC`);
  if (Number.isNaN(parsed.getTime())) return displayDate;
  return parsed.toISOString().slice(0, 10);
}

export async function readWorkspace(
  db: D1Database,
): Promise<WorkspaceSnapshot> {
  const [
    clientRows,
    locationRows,
    equipmentRows,
    templateRows,
    technicianRows,
    serviceTypeRows,
    reportRows,
    signatureRows,
    auditRows,
  ] = await Promise.all([
    db.prepare("SELECT * FROM clients ORDER BY name").all(),
    db.prepare("SELECT * FROM locations ORDER BY name").all(),
    db.prepare("SELECT * FROM equipment ORDER BY name").all(),
    db.prepare("SELECT * FROM checklist_templates ORDER BY name").all(),
    db.prepare("SELECT * FROM technicians ORDER BY name").all(),
    db.prepare("SELECT * FROM service_types ORDER BY name").all(),
    db
      .prepare(
        "SELECT * FROM service_reports ORDER BY CAST(report_no AS INTEGER) DESC, created_at DESC",
      )
      .all(),
    db.prepare("SELECT * FROM report_signatures").all(),
    db
      .prepare(
        "SELECT * FROM audit_events ORDER BY created_at DESC",
      )
      .all(),
  ]);

  const clients = (clientRows.results ?? []).map(
    (row): ClientRecord => ({
      id: text((row as Record<string, unknown>).id),
      name: text((row as Record<string, unknown>).name),
      contactName: text((row as Record<string, unknown>).contact_name),
      email: text((row as Record<string, unknown>).email),
      phone: text((row as Record<string, unknown>).phone),
      address: text((row as Record<string, unknown>).address),
      active: bool((row as Record<string, unknown>).active),
    }),
  );
  const locations = (locationRows.results ?? []).map(
    (row): LocationRecord => ({
      id: text((row as Record<string, unknown>).id),
      clientId: text((row as Record<string, unknown>).client_id),
      name: text((row as Record<string, unknown>).name),
      address: text((row as Record<string, unknown>).address),
      active: bool((row as Record<string, unknown>).active),
    }),
  );
  const equipment = (equipmentRows.results ?? []).map(
    (row): EquipmentRecord => ({
      id: text((row as Record<string, unknown>).id),
      clientId: text((row as Record<string, unknown>).client_id),
      locationId: text((row as Record<string, unknown>).location_id),
      name: text((row as Record<string, unknown>).name),
      type: text((row as Record<string, unknown>).type),
      brand: text((row as Record<string, unknown>).brand),
      model: text((row as Record<string, unknown>).model),
      serial: text((row as Record<string, unknown>).serial),
      checklistTemplateId: text(
        (row as Record<string, unknown>).checklist_template_id,
      ),
      active: bool((row as Record<string, unknown>).active),
    }),
  );
  const checklistTemplates = (templateRows.results ?? []).map(
    (row): ChecklistTemplateRecord => ({
      id: text((row as Record<string, unknown>).id),
      name: text((row as Record<string, unknown>).name),
      equipmentType: text(
        (row as Record<string, unknown>).equipment_type,
      ),
      items: parseJson<string[]>(
        (row as Record<string, unknown>).items_json,
        [],
      ),
      measurements: parseJson<Array<{ label: string; unit: string }>>(
        (row as Record<string, unknown>).measurements_json,
        [],
      ),
      active: bool((row as Record<string, unknown>).active),
    }),
  );
  const technicians = (technicianRows.results ?? []).map(
    (row): TechnicianRecord => ({
      id: text((row as Record<string, unknown>).id),
      name: text((row as Record<string, unknown>).name),
      designation: text((row as Record<string, unknown>).designation),
      email: text((row as Record<string, unknown>).email),
      phone: text((row as Record<string, unknown>).phone),
      active: bool((row as Record<string, unknown>).active),
    }),
  );
  const serviceTypes = (serviceTypeRows.results ?? []).map(
    (row): ServiceTypeRecord => ({
      id: text((row as Record<string, unknown>).id),
      name: text((row as Record<string, unknown>).name),
      description: text((row as Record<string, unknown>).description),
      active: bool((row as Record<string, unknown>).active),
    }),
  );

  const signatures = new Map<string, DigitalSignature>();
  for (const raw of signatureRows.results ?? []) {
    const row = raw as Record<string, unknown>;
    signatures.set(text(row.report_no), {
      signerName: text(row.signer_name),
      signerEmail: text(row.signer_email),
      designation: text(row.designation),
      signedAt: text(row.signed_at),
      channel: text(row.channel) as DigitalSignature["channel"],
      dataUrl: row.signature_data_url ? text(row.signature_data_url) : null,
      consentText: text(row.consent_text),
    });
  }

  const auditByReport = new Map<string, AuditEvent[]>();
  for (const raw of auditRows.results ?? []) {
    const row = raw as Record<string, unknown>;
    const reportId = text(row.report_no);
    const event: AuditEvent = {
      id: text(row.id),
      reportId,
      action: text(row.action),
      actorName: text(row.actor_name),
      channel: text(row.channel),
      createdAt: text(row.created_at),
      detail: text(row.detail),
    };
    auditByReport.set(reportId, [
      ...(auditByReport.get(reportId) ?? []),
      event,
    ]);
  }

  const reports = (reportRows.results ?? []).map((raw): WorkspaceReport => {
    const row = raw as Record<string, unknown>;
    const reportId = text(row.report_no);
    const serviceDate = text(row.service_date);
    const signature = signatures.get(reportId) ?? null;
    const acknowledgement = parseJson<WorkspaceReport["acknowledgement"]>(
      row.acknowledgement_json,
      {
        name: "Awaiting customer signature",
        designation: "",
        signedDate: "",
        source: "Digital signature pending",
      },
    );

    return {
      id: reportId,
      clientId: text(row.client_id),
      locationId: text(row.location_id),
      client: text(row.client_name_snapshot),
      address: text(row.address_snapshot),
      date: formatDisplayDate(serviceDate),
      serviceMonth: text(row.service_month),
      serviceType: text(row.service_type),
      status: text(row.status) as WorkspaceReport["status"],
      condition: text(row.condition) as WorkspaceReport["condition"],
      summary: text(row.summary),
      workPerformed: parseJson<string[]>(row.work_performed_json, []),
      equipment: parseJson<WorkspaceReport["equipment"]>(
        row.equipment_json,
        [],
      ),
      technicianIds: parseJson<string[]>(row.technician_ids_json, []),
      technicians: parseJson<string[]>(row.technicians_json, []),
      remarks: text(row.remarks),
      followUp: text(row.follow_up),
      acknowledgement: signature
        ? {
            name: signature.signerName,
            designation: signature.designation,
            signedDate: formatDisplayDate(signature.signedAt.slice(0, 10)),
            source:
              signature.channel === "client_portal"
                ? "Signed through secure client link"
                : signature.channel === "admin_device"
                  ? "Signed on Promach admin device"
                  : "Signed on original paper report",
          }
        : acknowledgement,
      sourceDocument: row.source_document_json
        ? parseJson<WorkspaceReport["sourceDocument"]>(
            row.source_document_json,
            undefined,
          )
        : undefined,
      transcriptionNotes: parseJson<string[]>(
        row.transcription_notes_json,
        [],
      ),
      createdAt: text(row.created_at),
      sentAt: row.sent_at ? text(row.sent_at) : null,
      signature,
      auditTrail: auditByReport.get(reportId) ?? [],
    };
  });

  return {
    clients,
    locations,
    equipment,
    checklistTemplates,
    technicians,
    serviceTypes,
    reports,
  };
}

export function companyName(): string {
  return company.name;
}
