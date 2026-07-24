import type {
  ChecklistTemplateRecord,
  ClientRecord,
  CreateReportPayload,
  EquipmentRecord,
  LocationRecord,
  MasterEntity,
  TechnicianRecord,
  WorkspaceReport,
} from "../app/workspaceTypes";
import {
  companyName,
  type D1Database,
  ensureDatabase,
  readWorkspace,
} from "./database";

export interface ApiEnv {
  DB?: D1Database;
}

const SIGNATURE_LIMIT = 700_000;
const CONSENT_TEXT =
  "I confirm that the service work described in this report has been completed to our satisfaction and I agree to use this digital signature as my acknowledgement.";

function responseJson(
  payload: unknown,
  status = 200,
  extraHeaders?: HeadersInit,
): Response {
  const headers = new Headers(extraHeaders);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  headers.set("x-content-type-options", "nosniff");
  return new Response(JSON.stringify(payload), { status, headers });
}

function apiError(message: string, status = 400): Response {
  return responseJson({ error: message }, status);
}

function database(env: ApiEnv): D1Database | null {
  return env.DB ?? null;
}

function isLocalRequest(request: Request): boolean {
  const hostname = new URL(request.url).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function adminIdentity(request: Request): { email: string; name: string } | null {
  const email = request.headers.get("oai-authenticated-user-email");
  const encodedName = request.headers.get("oai-authenticated-user-full-name");
  const encoding = request.headers.get(
    "oai-authenticated-user-full-name-encoding",
  );
  let name = email ?? "";
  if (encodedName && encoding === "percent-encoded-utf-8") {
    try {
      name = decodeURIComponent(encodedName);
    } catch {
      name = email ?? "";
    }
  }
  if (email) return { email, name: name || email };
  if (isLocalRequest(request)) {
    return { email: "local-admin@promach.local", name: "Local Promach Admin" };
  }
  return null;
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

async function jsonBody<T>(request: Request): Promise<T | null> {
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return null;
  }
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

function required(value: unknown, label: string, max = 500): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) throw new Error(`${label} is required.`);
  if (normalized.length > max) throw new Error(`${label} is too long.`);
  return normalized;
}

function optional(value: unknown, max = 1_000): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (normalized.length > max) throw new Error("A submitted value is too long.");
  return normalized;
}

function activeValue(value: unknown): boolean {
  return !(
    value === false ||
    value === 0 ||
    value === "0" ||
    value === "false"
  );
}

class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function monthLabel(dateValue: string): string {
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return dateValue;
  return new Intl.DateTimeFormat("en-SG", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

async function sha256(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function secureToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function validSignature(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= SIGNATURE_LIMIT &&
    /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(value)
  );
}

async function createMasterRecord(
  db: D1Database,
  entity: MasterEntity,
  payload: Record<string, unknown>,
): Promise<void> {
  if (entity === "clients") {
    const item: ClientRecord = {
      id: newId("client"),
      name: required(payload.name, "Client name"),
      contactName: optional(payload.contactName, 200),
      email: optional(payload.email, 320),
      phone: optional(payload.phone, 80),
      address: required(payload.address, "Client address", 800),
      active: true,
    };
    await db
      .prepare(
        "INSERT INTO clients (id, name, contact_name, email, phone, address, active) VALUES (?, ?, ?, ?, ?, ?, 1)",
      )
      .bind(
        item.id,
        item.name,
        item.contactName,
        item.email,
        item.phone,
        item.address,
      )
      .run();
    return;
  }

  if (entity === "locations") {
    const item: LocationRecord = {
      id: newId("location"),
      clientId: required(payload.clientId, "Client"),
      name: required(payload.name, "Location name"),
      address: required(payload.address, "Location address", 800),
      active: true,
    };
    const client = await db
      .prepare("SELECT id FROM clients WHERE id = ? AND active = 1")
      .bind(item.clientId)
      .first();
    if (!client) throw new Error("Select an active client.");
    await db
      .prepare(
        "INSERT INTO locations (id, client_id, name, address, active) VALUES (?, ?, ?, ?, 1)",
      )
      .bind(item.id, item.clientId, item.name, item.address)
      .run();
    return;
  }

  if (entity === "checklist-templates") {
    const rawItems = Array.isArray(payload.items) ? payload.items : [];
    const items = rawItems
      .map((item) => optional(item, 500))
      .filter(Boolean)
      .slice(0, 80);
    if (!items.length) throw new Error("Add at least one checklist item.");
    const item: ChecklistTemplateRecord = {
      id: newId("template"),
      name: required(payload.name, "Template name"),
      equipmentType: required(payload.equipmentType, "Equipment type"),
      items,
      measurements: (Array.isArray(payload.measurements)
        ? payload.measurements
        : []
      )
        .map((raw) => {
          const measurement =
            raw && typeof raw === "object"
              ? (raw as Record<string, unknown>)
              : {};
          return {
            label: optional(measurement.label, 200),
            unit: optional(measurement.unit, 40),
          };
        })
        .filter((measurement) => measurement.label)
        .slice(0, 30),
      active: true,
    };
    await db
      .prepare(
        "INSERT INTO checklist_templates (id, name, equipment_type, items_json, measurements_json, active) VALUES (?, ?, ?, ?, ?, 1)",
      )
      .bind(
        item.id,
        item.name,
        item.equipmentType,
        JSON.stringify(item.items),
        JSON.stringify(item.measurements),
      )
      .run();
    return;
  }

  if (entity === "equipment") {
    const item: EquipmentRecord = {
      id: newId("equipment"),
      clientId: required(payload.clientId, "Client"),
      locationId: required(payload.locationId, "Location"),
      name: required(payload.name, "Equipment name"),
      type: required(payload.type, "Equipment type"),
      brand: optional(payload.brand, 200) || "Not recorded",
      model: optional(payload.model, 200) || "Not recorded",
      serial: optional(payload.serial, 200) || "Not recorded",
      checklistTemplateId: required(
        payload.checklistTemplateId,
        "Checklist template",
      ),
      active: true,
    };
    const location = await db
      .prepare(
        "SELECT id FROM locations WHERE id = ? AND client_id = ? AND active = 1",
      )
      .bind(item.locationId, item.clientId)
      .first();
    const template = await db
      .prepare(
        "SELECT id FROM checklist_templates WHERE id = ? AND active = 1",
      )
      .bind(item.checklistTemplateId)
      .first();
    if (!location) throw new Error("Select a location belonging to this client.");
    if (!template) throw new Error("Select an active checklist template.");
    await db
      .prepare(
        "INSERT INTO equipment (id, client_id, location_id, name, type, brand, model, serial, checklist_template_id, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)",
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
      )
      .run();
    return;
  }

  if (entity === "technicians") {
    const item: TechnicianRecord = {
      id: newId("technician"),
      name: required(payload.name, "Technician name"),
      designation:
        optional(payload.designation, 200) || "Service Technician",
      email: optional(payload.email, 320),
      phone: optional(payload.phone, 80),
      active: true,
    };
    await db
      .prepare(
        "INSERT INTO technicians (id, name, designation, email, phone, active) VALUES (?, ?, ?, ?, ?, 1)",
      )
      .bind(
        item.id,
        item.name,
        item.designation,
        item.email,
        item.phone,
      )
      .run();
    return;
  }

  throw new Error("Unknown master-data section.");
}

async function updateMasterRecord(
  db: D1Database,
  entity: MasterEntity,
  id: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const recordId = required(id, "Record ID", 200);
  const active = activeValue(payload.active) ? 1 : 0;

  if (entity === "clients") {
    const existing = await db
      .prepare("SELECT id FROM clients WHERE id = ?")
      .bind(recordId)
      .first();
    if (!existing) throw new ApiRequestError("Client not found.", 404);
    await db
      .prepare(
        "UPDATE clients SET name = ?, contact_name = ?, email = ?, phone = ?, address = ?, active = ? WHERE id = ?",
      )
      .bind(
        required(payload.name, "Client name"),
        optional(payload.contactName, 200),
        optional(payload.email, 320),
        optional(payload.phone, 80),
        required(payload.address, "Client address", 800),
        active,
        recordId,
      )
      .run();
    return;
  }

  if (entity === "locations") {
    const existing = await db
      .prepare("SELECT id FROM locations WHERE id = ?")
      .bind(recordId)
      .first();
    if (!existing) throw new ApiRequestError("Site not found.", 404);
    const clientId = required(payload.clientId, "Client");
    const client = await db
      .prepare("SELECT id FROM clients WHERE id = ?")
      .bind(clientId)
      .first();
    if (!client) throw new Error("Select a valid client.");
    await db
      .prepare(
        "UPDATE locations SET client_id = ?, name = ?, address = ?, active = ? WHERE id = ?",
      )
      .bind(
        clientId,
        required(payload.name, "Location name"),
        required(payload.address, "Location address", 800),
        active,
        recordId,
      )
      .run();
    return;
  }

  if (entity === "checklist-templates") {
    const existing = await db
      .prepare("SELECT id FROM checklist_templates WHERE id = ?")
      .bind(recordId)
      .first();
    if (!existing) {
      throw new ApiRequestError("Checklist template not found.", 404);
    }
    const items = (Array.isArray(payload.items) ? payload.items : [])
      .map((item) => optional(item, 500))
      .filter(Boolean)
      .slice(0, 80);
    if (!items.length) throw new Error("Add at least one checklist item.");
    const measurements = (
      Array.isArray(payload.measurements) ? payload.measurements : []
    )
      .map((raw) => {
        const measurement =
          raw && typeof raw === "object"
            ? (raw as Record<string, unknown>)
            : {};
        return {
          label: optional(measurement.label, 200),
          unit: optional(measurement.unit, 40),
        };
      })
      .filter((measurement) => measurement.label)
      .slice(0, 30);
    await db
      .prepare(
        "UPDATE checklist_templates SET name = ?, equipment_type = ?, items_json = ?, measurements_json = ?, active = ? WHERE id = ?",
      )
      .bind(
        required(payload.name, "Template name"),
        required(payload.equipmentType, "Equipment type"),
        JSON.stringify(items),
        JSON.stringify(measurements),
        active,
        recordId,
      )
      .run();
    return;
  }

  if (entity === "equipment") {
    const existing = await db
      .prepare("SELECT id FROM equipment WHERE id = ?")
      .bind(recordId)
      .first();
    if (!existing) throw new ApiRequestError("Equipment not found.", 404);
    const clientId = required(payload.clientId, "Client");
    const locationId = required(payload.locationId, "Location");
    const checklistTemplateId = required(
      payload.checklistTemplateId,
      "Checklist template",
    );
    const location = await db
      .prepare(
        "SELECT id FROM locations WHERE id = ? AND client_id = ?",
      )
      .bind(locationId, clientId)
      .first();
    const template = await db
      .prepare("SELECT id FROM checklist_templates WHERE id = ?")
      .bind(checklistTemplateId)
      .first();
    if (!location) throw new Error("Select a location belonging to this client.");
    if (!template) throw new Error("Select a valid checklist template.");
    await db
      .prepare(
        "UPDATE equipment SET client_id = ?, location_id = ?, name = ?, type = ?, brand = ?, model = ?, serial = ?, checklist_template_id = ?, active = ? WHERE id = ?",
      )
      .bind(
        clientId,
        locationId,
        required(payload.name, "Equipment name"),
        required(payload.type, "Equipment type"),
        optional(payload.brand, 200) || "Not recorded",
        optional(payload.model, 200) || "Not recorded",
        optional(payload.serial, 200) || "Not recorded",
        checklistTemplateId,
        active,
        recordId,
      )
      .run();
    return;
  }

  if (entity === "technicians") {
    const existing = await db
      .prepare("SELECT id FROM technicians WHERE id = ?")
      .bind(recordId)
      .first();
    if (!existing) throw new ApiRequestError("Technician not found.", 404);
    await db
      .prepare(
        "UPDATE technicians SET name = ?, designation = ?, email = ?, phone = ?, active = ? WHERE id = ?",
      )
      .bind(
        required(payload.name, "Technician name"),
        optional(payload.designation, 200) || "Service Technician",
        optional(payload.email, 320),
        optional(payload.phone, 80),
        active,
        recordId,
      )
      .run();
    return;
  }

  throw new ApiRequestError("Unknown master-data section.", 404);
}

async function referenceCount(
  db: D1Database,
  sql: string,
  value: string,
): Promise<number> {
  const result = await db
    .prepare(sql)
    .bind(value)
    .first<{ count: number }>();
  return Number(result?.count ?? 0);
}

async function deleteMasterRecord(
  db: D1Database,
  entity: MasterEntity,
  id: string,
): Promise<void> {
  const recordId = required(id, "Record ID", 200);

  if (entity === "clients") {
    const [locations, equipmentItems, reports] = await Promise.all([
      referenceCount(
        db,
        "SELECT COUNT(*) AS count FROM locations WHERE client_id = ?",
        recordId,
      ),
      referenceCount(
        db,
        "SELECT COUNT(*) AS count FROM equipment WHERE client_id = ?",
        recordId,
      ),
      referenceCount(
        db,
        "SELECT COUNT(*) AS count FROM service_reports WHERE client_id = ?",
        recordId,
      ),
    ]);
    if (locations || equipmentItems || reports) {
      throw new ApiRequestError(
        `This client cannot be deleted because it is linked to ${locations} site(s), ${equipmentItems} equipment record(s), and ${reports} service report(s). Remove dependent master records first; historical reports must remain protected.`,
        409,
      );
    }
    await db.prepare("DELETE FROM clients WHERE id = ?").bind(recordId).run();
    return;
  }

  if (entity === "locations") {
    const [equipmentItems, reports] = await Promise.all([
      referenceCount(
        db,
        "SELECT COUNT(*) AS count FROM equipment WHERE location_id = ?",
        recordId,
      ),
      referenceCount(
        db,
        "SELECT COUNT(*) AS count FROM service_reports WHERE location_id = ?",
        recordId,
      ),
    ]);
    if (equipmentItems || reports) {
      throw new ApiRequestError(
        `This site cannot be deleted because it is linked to ${equipmentItems} equipment record(s) and ${reports} service report(s). Delete or move its equipment first; historical reports must remain protected.`,
        409,
      );
    }
    await db.prepare("DELETE FROM locations WHERE id = ?").bind(recordId).run();
    return;
  }

  if (entity === "checklist-templates") {
    const equipmentItems = await referenceCount(
      db,
      "SELECT COUNT(*) AS count FROM equipment WHERE checklist_template_id = ?",
      recordId,
    );
    if (equipmentItems) {
      throw new ApiRequestError(
        `This checklist cannot be deleted because ${equipmentItems} equipment record(s) use it. Assign those records to another checklist first.`,
        409,
      );
    }
    await db
      .prepare("DELETE FROM checklist_templates WHERE id = ?")
      .bind(recordId)
      .run();
    return;
  }

  if (entity === "equipment") {
    await db.prepare("DELETE FROM equipment WHERE id = ?").bind(recordId).run();
    return;
  }

  if (entity === "technicians") {
    await db
      .prepare("DELETE FROM technicians WHERE id = ?")
      .bind(recordId)
      .run();
    return;
  }

  throw new ApiRequestError("Unknown master-data section.", 404);
}

async function createReport(
  db: D1Database,
  payload: CreateReportPayload,
  actorName: string,
): Promise<string> {
  const clientId = required(payload.clientId, "Client");
  const locationId = required(payload.locationId, "Location");
  const serviceDate = required(payload.serviceDate, "Service date", 20);
  const serviceType = required(payload.serviceType, "Service type");
  const summary = required(payload.summary, "Service summary", 2_000);
  const remarks = optional(payload.remarks, 3_000);
  const followUp = optional(payload.followUp, 2_000) || "No follow-up required.";
  const workPerformed = (Array.isArray(payload.workPerformed)
    ? payload.workPerformed
    : []
  )
    .map((item) => optional(item, 700))
    .filter(Boolean)
    .slice(0, 50);
  const equipmentIds = Array.isArray(payload.equipmentIds)
    ? [...new Set(payload.equipmentIds.map(String))]
    : [];
  const technicianIds = Array.isArray(payload.technicianIds)
    ? [...new Set(payload.technicianIds.map(String))]
    : [];

  if (!workPerformed.length) throw new Error("Add at least one work item.");
  if (!equipmentIds.length) throw new Error("Select at least one equipment item.");
  if (!technicianIds.length) throw new Error("Select at least one technician.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(serviceDate)) {
    throw new Error("Enter a valid service date.");
  }

  const workspace = await readWorkspace(db);
  const client = workspace.clients.find(
    (item) => item.id === clientId && item.active,
  );
  const location = workspace.locations.find(
    (item) =>
      item.id === locationId && item.clientId === clientId && item.active,
  );
  if (!client || !location) throw new Error("Select a valid client and location.");

  const selectedEquipment = equipmentIds.map((id) =>
    workspace.equipment.find(
      (item) =>
        item.id === id &&
        item.clientId === clientId &&
        item.locationId === locationId &&
        item.active,
    ),
  );
  if (selectedEquipment.some((item) => !item)) {
    throw new Error("One or more equipment selections are invalid.");
  }

  const selectedTechnicians = technicianIds.map((id) =>
    workspace.technicians.find((item) => item.id === id && item.active),
  );
  if (selectedTechnicians.some((item) => !item)) {
    throw new Error("One or more technician selections are invalid.");
  }

  const equipmentSnapshots = selectedEquipment.map((item) => {
    const template = workspace.checklistTemplates.find(
      (candidate) => candidate.id === item!.checklistTemplateId,
    );
    const submittedResults = payload.checklistResults?.[item!.id] ?? [];
    const checklistResults = (template?.items ?? []).map((checkItem, index) => {
      const submitted = submittedResults[index];
      const result = ["YES", "NO", "N/A"].includes(submitted?.result)
        ? submitted.result
        : "YES";
      return {
        item: checkItem,
        result: result as "YES" | "NO" | "N/A",
        remark: optional(submitted?.remark, 500),
      };
    });
    const submittedMeasurements = payload.measurements?.[item!.id] ?? [];
    const measurements = (template?.measurements ?? []).map(
      (definition, index) => ({
        label: definition.label,
        unit: definition.unit,
        value: optional(submittedMeasurements[index]?.value, 120),
      }),
    );
    return {
      id: item!.id,
      name: item!.name,
      type: item!.type,
      brand: item!.brand,
      model: item!.model,
      serial: item!.serial,
      location: location.name,
      checklist: template?.items ?? [],
      checklistResults,
      measurements,
      note:
        optional(payload.equipmentNotes?.[item!.id], 1_000) ||
        "Service checklist completed.",
    };
  });

  const next = await db
    .prepare(
      "SELECT COALESCE(MAX(CAST(report_no AS INTEGER)), 4122) + 1 AS next_no FROM service_reports",
    )
    .first<{ next_no: number }>();
  const reportNo = String(Number(next?.next_no ?? 4123));
  const now = new Date().toISOString();
  const condition = followUp.toLowerCase().startsWith("no follow-up")
    ? "Running normally"
    : "Follow-up required";

  await db.batch([
    db
      .prepare(
        `INSERT INTO service_reports (
          report_no, client_id, location_id, client_name_snapshot, address_snapshot,
          service_date, service_month, service_type, status, condition, summary,
          work_performed_json, equipment_json, technician_ids_json, technicians_json,
          remarks, follow_up, acknowledgement_json, source_document_json,
          transcription_notes_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, '[]', ?, ?)`,
      )
      .bind(
        reportNo,
        clientId,
        locationId,
        client.name,
        location.address,
        serviceDate,
        monthLabel(serviceDate),
        serviceType,
        condition,
        summary,
        JSON.stringify(workPerformed),
        JSON.stringify(equipmentSnapshots),
        JSON.stringify(technicianIds),
        JSON.stringify(selectedTechnicians.map((item) => item!.name)),
        remarks || "No additional remarks.",
        followUp,
        JSON.stringify({
          name: "Awaiting customer signature",
          designation: "",
          signedDate: "",
          source: "Digital signature pending",
        }),
        now,
        now,
      ),
    db
      .prepare(
        "INSERT INTO audit_events (id, report_no, action, actor_name, channel, detail, created_at) VALUES (?, ?, ?, ?, 'admin_portal', ?, ?)",
      )
      .bind(
        newId("audit"),
        reportNo,
        "Draft created",
        actorName,
        "Report created from master data.",
        now,
      ),
  ]);
  return reportNo;
}

async function sendReport(
  db: D1Database,
  reportNo: string,
  actorName: string,
): Promise<string> {
  const row = await db
    .prepare("SELECT status FROM service_reports WHERE report_no = ?")
    .bind(reportNo)
    .first<{ status: string }>();
  if (!row) throw new Error("Report not found.");
  if (
    !["Draft", "Correction required", "Awaiting client signature"].includes(
      row.status,
    )
  ) {
    throw new Error("Only an unsigned report can receive a client link.");
  }
  const token = secureToken();
  const tokenHash = await sha256(token);
  const now = new Date().toISOString();
  await db.batch([
    db
      .prepare(
        "UPDATE service_reports SET status = 'Awaiting client signature', share_token_hash = ?, sent_at = ?, updated_at = ? WHERE report_no = ?",
      )
      .bind(tokenHash, now, now, reportNo),
    db
      .prepare(
        "INSERT INTO audit_events (id, report_no, action, actor_name, channel, detail, created_at) VALUES (?, ?, 'Sent to client', ?, 'secure_link', 'A new one-report signing link was issued.', ?)",
      )
      .bind(newId("audit"), reportNo, actorName, now),
  ]);
  return `/?sign=${encodeURIComponent(token)}`;
}

async function findClientReport(
  db: D1Database,
  token: string,
): Promise<WorkspaceReport | null> {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const tokenHash = await sha256(token);
  const row = await db
    .prepare(
      "SELECT report_no FROM service_reports WHERE share_token_hash = ? AND status IN ('Awaiting client signature', 'Completed')",
    )
    .bind(tokenHash)
    .first<{ report_no: string }>();
  if (!row) return null;
  const workspace = await readWorkspace(db);
  return (
    workspace.reports.find((report) => report.id === String(row.report_no)) ??
    null
  );
}

async function signReport(
  db: D1Database,
  reportNo: string,
  payload: Record<string, unknown>,
  channel: "client_portal" | "admin_device",
  actorName?: string,
): Promise<void> {
  const signerName = required(payload.signerName, "Signer name", 200);
  const signerEmail = required(payload.signerEmail, "Signer email", 320);
  const designation = required(payload.designation, "Designation", 200);
  if (payload.consent !== true) throw new Error("Signature consent is required.");
  if (!validSignature(payload.signatureDataUrl)) {
    throw new Error("Add a valid signature inside the signature box.");
  }
  const report = await db
    .prepare("SELECT status FROM service_reports WHERE report_no = ?")
    .bind(reportNo)
    .first<{ status: string }>();
  if (!report) throw new Error("Report not found.");
  if (report.status !== "Awaiting client signature") {
    throw new Error(
      report.status === "Completed"
        ? "This report has already been signed and locked."
        : "This report is not ready for signature.",
    );
  }
  const now = new Date().toISOString();
  await db.batch([
    db
      .prepare(
        `INSERT INTO report_signatures (
          id, report_no, signer_name, signer_email, designation, signed_at,
          channel, signature_data_url, consent_text
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(report_no) DO UPDATE SET
          signer_name = excluded.signer_name,
          signer_email = excluded.signer_email,
          designation = excluded.designation,
          signed_at = excluded.signed_at,
          channel = excluded.channel,
          signature_data_url = excluded.signature_data_url,
          consent_text = excluded.consent_text`,
      )
      .bind(
        newId("signature"),
        reportNo,
        signerName,
        signerEmail,
        designation,
        now,
        channel,
        payload.signatureDataUrl,
        CONSENT_TEXT,
      ),
    db
      .prepare(
        "UPDATE service_reports SET status = 'Completed', updated_at = ? WHERE report_no = ?",
      )
      .bind(now, reportNo),
    db
      .prepare(
        "INSERT INTO audit_events (id, report_no, action, actor_name, channel, detail, created_at) VALUES (?, ?, 'Digitally signed and completed', ?, ?, ?, ?)",
      )
      .bind(
        newId("audit"),
        reportNo,
        actorName || signerName,
        channel,
        `Signed by ${signerName} (${signerEmail}). The completed report is locked.`,
        now,
      ),
  ]);
}

export async function handleApiRequest(
  request: Request,
  env: ApiEnv,
): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/")) return null;

  const db = database(env);
  if (!db) {
    return apiError("The report database is not available.", 503);
  }

  try {
    await ensureDatabase(db);
    const segments = url.pathname.split("/").filter(Boolean);

    if (
      request.method === "GET" &&
      segments[1] === "client" &&
      segments[2] === "reports" &&
      segments.length === 4
    ) {
      const report = await findClientReport(db, decodeURIComponent(segments[3]));
      return report
        ? responseJson({ report, companyName: companyName() })
        : apiError("This signing link is invalid, expired, or has been replaced.", 404);
    }

    if (
      request.method === "POST" &&
      segments[1] === "client" &&
      segments[2] === "reports" &&
      segments[4] === "sign"
    ) {
      if (!sameOrigin(request)) return apiError("Invalid request origin.", 403);
      const token = decodeURIComponent(segments[3] ?? "");
      const report = await findClientReport(db, token);
      if (!report) {
        return apiError("This signing link is invalid, expired, or has been replaced.", 404);
      }
      const payload = await jsonBody<Record<string, unknown>>(request);
      if (!payload) return apiError("A JSON request body is required.", 415);
      await signReport(db, report.id, payload, "client_portal");
      const workspace = await readWorkspace(db);
      return responseJson({
        report: workspace.reports.find((item) => item.id === report.id),
      });
    }

    const admin = adminIdentity(request);
    if (!admin) return apiError("Sign in as a Promach administrator.", 401);

    if (request.method === "GET" && url.pathname === "/api/workspace") {
      return responseJson(await readWorkspace(db));
    }

    if (
      request.method === "POST" &&
      segments[1] === "master" &&
      segments.length === 3
    ) {
      if (!sameOrigin(request)) return apiError("Invalid request origin.", 403);
      const entity = segments[2] as MasterEntity;
      const payload = await jsonBody<Record<string, unknown>>(request);
      if (!payload) return apiError("A JSON request body is required.", 415);
      await createMasterRecord(db, entity, payload);
      return responseJson(await readWorkspace(db), 201);
    }

    if (
      request.method === "PUT" &&
      segments[1] === "master" &&
      segments.length === 4
    ) {
      if (!sameOrigin(request)) return apiError("Invalid request origin.", 403);
      const entity = segments[2] as MasterEntity;
      const recordId = decodeURIComponent(segments[3]);
      const payload = await jsonBody<Record<string, unknown>>(request);
      if (!payload) return apiError("A JSON request body is required.", 415);
      await updateMasterRecord(db, entity, recordId, payload);
      return responseJson(await readWorkspace(db));
    }

    if (
      request.method === "DELETE" &&
      segments[1] === "master" &&
      segments.length === 4
    ) {
      if (!sameOrigin(request)) return apiError("Invalid request origin.", 403);
      const entity = segments[2] as MasterEntity;
      const recordId = decodeURIComponent(segments[3]);
      await deleteMasterRecord(db, entity, recordId);
      return responseJson(await readWorkspace(db));
    }

    if (request.method === "POST" && url.pathname === "/api/reports") {
      if (!sameOrigin(request)) return apiError("Invalid request origin.", 403);
      const payload = await jsonBody<CreateReportPayload>(request);
      if (!payload) return apiError("A JSON request body is required.", 415);
      const reportNo = await createReport(db, payload, admin.name);
      const workspace = await readWorkspace(db);
      return responseJson(
        {
          report: workspace.reports.find((item) => item.id === reportNo),
          workspace,
        },
        201,
      );
    }

    if (
      request.method === "POST" &&
      segments[1] === "reports" &&
      segments[3] === "send"
    ) {
      if (!sameOrigin(request)) return apiError("Invalid request origin.", 403);
      const sharePath = await sendReport(db, segments[2], admin.name);
      return responseJson({ sharePath, workspace: await readWorkspace(db) });
    }

    if (
      request.method === "POST" &&
      segments[1] === "reports" &&
      segments[3] === "sign-admin"
    ) {
      if (!sameOrigin(request)) return apiError("Invalid request origin.", 403);
      const payload = await jsonBody<Record<string, unknown>>(request);
      if (!payload) return apiError("A JSON request body is required.", 415);
      await signReport(db, segments[2], payload, "admin_device", admin.name);
      return responseJson({ workspace: await readWorkspace(db) });
    }

    return apiError("API route not found.", 404);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return apiError(
      message,
      error instanceof ApiRequestError ? error.status : 400,
    );
  }
}
