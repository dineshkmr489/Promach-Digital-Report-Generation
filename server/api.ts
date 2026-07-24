import type {
  ChecklistTemplateRecord,
  ClientRecord,
  CreateReportPayload,
  EquipmentRecord,
  LocationRecord,
  MasterEntity,
  ServiceTypeRecord,
  TechnicianRecord,
  WorkspaceReport,
} from "../app/workspaceTypes.ts";
import {
  adminIdentity,
  adminSessionCookie,
  clearAdminSessionCookie,
  createAdminSessionToken,
  verifyAdminCredentials,
} from "./adminAuth.ts";
import {
  completeReportSignature,
  ensureDatabase,
  findMasterRecord,
  findReport,
  findReportByShareHash,
  insertMasterRecord,
  insertReport,
  issueReportShareLink,
  nextReportNumber,
  readWorkspace,
  removeMasterRecord,
  replaceMasterRecord,
  serviceTypeNameExists,
  type MasterRecord,
} from "./database.ts";

const SIGNATURE_LIMIT = 700_000;
const CONSENT_TEXT =
  "I confirm that the service work described in this report has been completed to our satisfaction and I agree to use this digital signature as my acknowledgement.";
const masterEntities = new Set<MasterEntity>([
  "clients",
  "locations",
  "equipment",
  "checklist-templates",
  "technicians",
  "service-types",
]);
const LOGIN_WINDOW_MS = 15 * 60 * 1_000;
const LOGIN_ATTEMPT_LIMIT = 8;

type LoginAttempt = {
  failures: number;
  resetsAt: number;
};

declare global {
  var __promachLoginAttempts: Map<string, LoginAttempt> | undefined;
}

function loginAttempts(): Map<string, LoginAttempt> {
  globalThis.__promachLoginAttempts ??= new Map();
  return globalThis.__promachLoginAttempts;
}

function loginClientKey(request: Request): string {
  return (
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ||
    "local"
  );
}

function blockedLogin(key: string): boolean {
  const attempts = loginAttempts();
  const current = attempts.get(key);
  if (!current) return false;
  if (current.resetsAt <= Date.now()) {
    attempts.delete(key);
    return false;
  }
  return current.failures >= LOGIN_ATTEMPT_LIMIT;
}

function recordLoginFailure(key: string): void {
  const attempts = loginAttempts();
  const current = attempts.get(key);
  if (!current || current.resetsAt <= Date.now()) {
    attempts.set(key, {
      failures: 1,
      resetsAt: Date.now() + LOGIN_WINDOW_MS,
    });
    return;
  }
  current.failures += 1;
  attempts.set(key, current);
}

class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

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

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const requestHost =
      request.headers.get("x-forwarded-host") ??
      request.headers.get("host") ??
      new URL(request.url).host;
    return new URL(origin).host === requestHost;
  } catch {
    return false;
  }
}

async function jsonBody<T>(request: Request): Promise<T | null> {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .includes("application/json")
  ) {
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

function masterEntity(value: string | undefined): MasterEntity {
  if (!value || !masterEntities.has(value as MasterEntity)) {
    throw new ApiRequestError("Unknown master-data section.", 404);
  }
  return value as MasterEntity;
}

async function createMasterRecord(
  entity: MasterEntity,
  payload: Record<string, unknown>,
): Promise<void> {
  const workspace = await readWorkspace();
  let record: MasterRecord;

  if (entity === "clients") {
    record = {
      id: newId("client"),
      name: required(payload.name, "Client name"),
      contactName: optional(payload.contactName, 200),
      email: optional(payload.email, 320),
      phone: optional(payload.phone, 80),
      address: required(payload.address, "Client address", 800),
      active: true,
    } satisfies ClientRecord;
  } else if (entity === "locations") {
    const clientId = required(payload.clientId, "Client");
    if (!workspace.clients.some((item) => item.id === clientId && item.active)) {
      throw new Error("Select an active client.");
    }
    record = {
      id: newId("location"),
      clientId,
      name: required(payload.name, "Location name"),
      address: required(payload.address, "Location address", 800),
      active: true,
    } satisfies LocationRecord;
  } else if (entity === "checklist-templates") {
    const items = (Array.isArray(payload.items) ? payload.items : [])
      .map((item) => optional(item, 500))
      .filter(Boolean)
      .slice(0, 80);
    if (!items.length) throw new Error("Add at least one checklist item.");
    record = {
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
    } satisfies ChecklistTemplateRecord;
  } else if (entity === "equipment") {
    const clientId = required(payload.clientId, "Client");
    const locationId = required(payload.locationId, "Location");
    const checklistTemplateId = required(
      payload.checklistTemplateId,
      "Checklist template",
    );
    if (
      !workspace.locations.some(
        (item) =>
          item.id === locationId && item.clientId === clientId && item.active,
      )
    ) {
      throw new Error("Select a location belonging to this client.");
    }
    if (
      !workspace.checklistTemplates.some(
        (item) => item.id === checklistTemplateId && item.active,
      )
    ) {
      throw new Error("Select an active checklist template.");
    }
    record = {
      id: newId("equipment"),
      clientId,
      locationId,
      name: required(payload.name, "Equipment name"),
      type: required(payload.type, "Equipment type"),
      brand: optional(payload.brand, 200) || "Not recorded",
      model: optional(payload.model, 200) || "Not recorded",
      serial: optional(payload.serial, 200) || "Not recorded",
      checklistTemplateId,
      active: true,
    } satisfies EquipmentRecord;
  } else if (entity === "technicians") {
    record = {
      id: newId("technician"),
      name: required(payload.name, "Technician name"),
      designation:
        optional(payload.designation, 200) || "Service Technician",
      email: optional(payload.email, 320),
      phone: optional(payload.phone, 80),
      active: true,
    } satisfies TechnicianRecord;
  } else {
    const name = required(payload.name, "Service type name");
    if (await serviceTypeNameExists(name)) {
      throw new Error("A service type with this name already exists.");
    }
    record = {
      id: newId("service-type"),
      name,
      description: optional(payload.description, 500),
      active: true,
    } satisfies ServiceTypeRecord;
  }
  await insertMasterRecord(entity, record);
}

async function updateMasterRecord(
  entity: MasterEntity,
  id: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const recordId = required(id, "Record ID", 200);
  const existing = await findMasterRecord(entity, recordId);
  if (!existing) throw new ApiRequestError("Master record not found.", 404);
  const workspace = await readWorkspace();
  const active = activeValue(payload.active);
  let record: MasterRecord;

  if (entity === "clients") {
    record = {
      id: recordId,
      name: required(payload.name, "Client name"),
      contactName: optional(payload.contactName, 200),
      email: optional(payload.email, 320),
      phone: optional(payload.phone, 80),
      address: required(payload.address, "Client address", 800),
      active,
    } satisfies ClientRecord;
  } else if (entity === "locations") {
    const clientId = required(payload.clientId, "Client");
    if (!workspace.clients.some((item) => item.id === clientId)) {
      throw new Error("Select a valid client.");
    }
    record = {
      id: recordId,
      clientId,
      name: required(payload.name, "Location name"),
      address: required(payload.address, "Location address", 800),
      active,
    } satisfies LocationRecord;
  } else if (entity === "checklist-templates") {
    const items = (Array.isArray(payload.items) ? payload.items : [])
      .map((item) => optional(item, 500))
      .filter(Boolean)
      .slice(0, 80);
    if (!items.length) throw new Error("Add at least one checklist item.");
    record = {
      id: recordId,
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
      active,
    } satisfies ChecklistTemplateRecord;
  } else if (entity === "equipment") {
    const clientId = required(payload.clientId, "Client");
    const locationId = required(payload.locationId, "Location");
    const checklistTemplateId = required(
      payload.checklistTemplateId,
      "Checklist template",
    );
    if (
      !workspace.locations.some(
        (item) => item.id === locationId && item.clientId === clientId,
      )
    ) {
      throw new Error("Select a location belonging to this client.");
    }
    if (
      !workspace.checklistTemplates.some(
        (item) => item.id === checklistTemplateId,
      )
    ) {
      throw new Error("Select a valid checklist template.");
    }
    record = {
      id: recordId,
      clientId,
      locationId,
      name: required(payload.name, "Equipment name"),
      type: required(payload.type, "Equipment type"),
      brand: optional(payload.brand, 200) || "Not recorded",
      model: optional(payload.model, 200) || "Not recorded",
      serial: optional(payload.serial, 200) || "Not recorded",
      checklistTemplateId,
      active,
    } satisfies EquipmentRecord;
  } else if (entity === "technicians") {
    record = {
      id: recordId,
      name: required(payload.name, "Technician name"),
      designation:
        optional(payload.designation, 200) || "Service Technician",
      email: optional(payload.email, 320),
      phone: optional(payload.phone, 80),
      active,
    } satisfies TechnicianRecord;
  } else {
    const name = required(payload.name, "Service type name");
    if (await serviceTypeNameExists(name, recordId)) {
      throw new Error("A service type with this name already exists.");
    }
    record = {
      id: recordId,
      name,
      description: optional(payload.description, 500),
      active,
    } satisfies ServiceTypeRecord;
  }
  if (!(await replaceMasterRecord(entity, recordId, record))) {
    throw new ApiRequestError("Master record not found.", 404);
  }
}

async function deleteMasterRecord(
  entity: MasterEntity,
  id: string,
): Promise<void> {
  const recordId = required(id, "Record ID", 200);
  const workspace = await readWorkspace();
  if (!(await findMasterRecord(entity, recordId))) {
    throw new ApiRequestError("Master record not found.", 404);
  }

  if (entity === "clients") {
    const locations = workspace.locations.filter(
      (item) => item.clientId === recordId,
    ).length;
    const equipment = workspace.equipment.filter(
      (item) => item.clientId === recordId,
    ).length;
    const reports = workspace.reports.filter(
      (item) => item.clientId === recordId,
    ).length;
    if (locations || equipment || reports) {
      throw new ApiRequestError(
        `This client cannot be deleted because it is linked to ${locations} site(s), ${equipment} equipment record(s), and ${reports} service report(s). Remove dependent master records first; historical reports must remain protected.`,
        409,
      );
    }
  }
  if (entity === "locations") {
    const equipment = workspace.equipment.filter(
      (item) => item.locationId === recordId,
    ).length;
    const reports = workspace.reports.filter(
      (item) => item.locationId === recordId,
    ).length;
    if (equipment || reports) {
      throw new ApiRequestError(
        `This site cannot be deleted because it is linked to ${equipment} equipment record(s) and ${reports} service report(s). Delete or move its equipment first; historical reports must remain protected.`,
        409,
      );
    }
  }
  if (entity === "checklist-templates") {
    const equipment = workspace.equipment.filter(
      (item) => item.checklistTemplateId === recordId,
    ).length;
    if (equipment) {
      throw new ApiRequestError(
        `This checklist cannot be deleted because ${equipment} equipment record(s) use it. Assign those records to another checklist first.`,
        409,
      );
    }
  }
  await removeMasterRecord(entity, recordId);
}

async function createReport(
  payload: CreateReportPayload,
  actorName: string,
): Promise<string> {
  const clientId = required(payload.clientId, "Client");
  const locationId = required(payload.locationId, "Location");
  const serviceDate = required(payload.serviceDate, "Service date", 20);
  const serviceType = required(payload.serviceType, "Service type");
  const summary = required(payload.summary, "Service summary", 2_000);
  const remarks = optional(payload.remarks, 3_000);
  const followUp =
    optional(payload.followUp, 2_000) || "No follow-up required.";
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

  const workspace = await readWorkspace();
  const client = workspace.clients.find(
    (item) => item.id === clientId && item.active,
  );
  const location = workspace.locations.find(
    (item) =>
      item.id === locationId && item.clientId === clientId && item.active,
  );
  const selectedServiceType = workspace.serviceTypes.find(
    (item) => item.name === serviceType && item.active,
  );
  if (!client || !location) throw new Error("Select a valid client and location.");
  if (!selectedServiceType) throw new Error("Select an active service type.");

  const equipment = equipmentIds.map((id) =>
    workspace.equipment.find(
      (item) =>
        item.id === id &&
        item.clientId === clientId &&
        item.locationId === locationId &&
        item.active,
    ),
  );
  if (equipment.some((item) => !item)) {
    throw new Error("One or more equipment selections are invalid.");
  }
  const technicians = technicianIds.map((id) =>
    workspace.technicians.find((item) => item.id === id && item.active),
  );
  if (technicians.some((item) => !item)) {
    throw new Error("One or more technician selections are invalid.");
  }

  const equipmentSnapshots = (equipment as EquipmentRecord[]).map((item) => {
    const template = workspace.checklistTemplates.find(
      (candidate) => candidate.id === item.checklistTemplateId,
    );
    const submittedResults = payload.checklistResults?.[item.id] ?? [];
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
    const submittedMeasurements = payload.measurements?.[item.id] ?? [];
    return {
      id: item.id,
      name: item.name,
      type: item.type,
      brand: item.brand,
      model: item.model,
      serial: item.serial,
      location: location.name,
      checklist: template?.items ?? [],
      checklistResults,
      measurements: (template?.measurements ?? []).map(
        (definition, index) => ({
          label: definition.label,
          unit: definition.unit,
          value: optional(submittedMeasurements[index]?.value, 120),
        }),
      ),
      note:
        optional(payload.equipmentNotes?.[item.id], 1_000) ||
        "Service checklist completed.",
    };
  });

  const reportId = await nextReportNumber();
  const now = new Date().toISOString();
  const report: WorkspaceReport = {
    id: reportId,
    clientId,
    locationId,
    client: client.name,
    address: location.address,
    date: formatDisplayDate(serviceDate),
    serviceMonth: monthLabel(serviceDate),
    serviceType: selectedServiceType.name,
    status: "Draft",
    condition: followUp.toLowerCase().startsWith("no follow-up")
      ? "Running normally"
      : "Follow-up required",
    summary,
    workPerformed,
    equipment: equipmentSnapshots,
    technicianIds,
    technicians: (technicians as TechnicianRecord[]).map((item) => item.name),
    remarks: remarks || "No additional remarks.",
    followUp,
    acknowledgement: {
      name: "Awaiting customer signature",
      designation: "",
      signedDate: "",
    },
    createdAt: now,
    sentAt: null,
    signature: null,
    auditTrail: [
      {
        id: newId("audit"),
        reportId,
        action: "Draft created",
        actorName,
        channel: "admin_portal",
        createdAt: now,
        detail: "Report created from master data.",
      },
    ],
  };
  await insertReport(report);
  return reportId;
}

async function sendReport(
  reportId: string,
  actorName: string,
): Promise<string> {
  const token = secureToken();
  const tokenHash = await sha256(token);
  const now = new Date().toISOString();
  const result = await issueReportShareLink(reportId, tokenHash, now, {
    id: newId("audit"),
    reportId,
    action: "Sent to client",
    actorName,
    channel: "secure_link",
    createdAt: now,
    detail: "A new one-report signing link was issued.",
  });
  if (result === "missing") throw new ApiRequestError("Report not found.", 404);
  if (result === "locked") {
    throw new Error("Only an unsigned report can receive a client link.");
  }
  return `/?sign=${encodeURIComponent(token)}`;
}

async function findClientReport(token: string): Promise<WorkspaceReport | null> {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  return findReportByShareHash(await sha256(token));
}

async function signReport(
  reportId: string,
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
  const current = await findReport(reportId);
  if (!current) throw new ApiRequestError("Report not found.", 404);
  if (current.status !== "Awaiting client signature") {
    throw new Error(
      current.status === "Completed"
        ? "This report has already been signed and locked."
        : "This report is not ready for signature.",
    );
  }
  const now = new Date().toISOString();
  const result = await completeReportSignature(
    reportId,
    {
      signerName,
      signerEmail,
      designation,
      signedAt: now,
      channel,
      dataUrl: payload.signatureDataUrl,
      consentText: CONSENT_TEXT,
    },
    {
      name: signerName,
      designation,
      signedDate: formatDisplayDate(now.slice(0, 10)),
    },
    {
      id: newId("audit"),
      reportId,
      action: "Digitally signed and completed",
      actorName: actorName || signerName,
      channel,
      createdAt: now,
      detail: `Signed by ${signerName} (${signerEmail}). The completed report is locked.`,
    },
  );
  if (result !== "updated") {
    throw new Error("This report is no longer available for signature.");
  }
}

export async function handleApiRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/")) {
    return apiError("API route not found.", 404);
  }

  try {
    const segments = url.pathname.split("/").filter(Boolean);

    if (request.method === "POST" && url.pathname === "/api/auth/login") {
      if (!sameOrigin(request)) return apiError("Invalid request origin.", 403);
      const clientKey = loginClientKey(request);
      if (blockedLogin(clientKey)) {
        return responseJson(
          {
            error:
              "Too many unsuccessful sign-in attempts. Try again in 15 minutes.",
          },
          429,
          { "retry-after": String(LOGIN_WINDOW_MS / 1_000) },
        );
      }
      const payload = await jsonBody<Record<string, unknown>>(request);
      if (!payload) return apiError("A JSON request body is required.", 415);
      const username =
        typeof payload.username === "string" ? payload.username.trim() : "";
      const password =
        typeof payload.password === "string" ? payload.password : "";
      if (!verifyAdminCredentials(username, password)) {
        recordLoginFailure(clientKey);
        return apiError("The username or password is incorrect.", 401);
      }
      loginAttempts().delete(clientKey);
      return responseJson(
        { ok: true },
        200,
        {
          "set-cookie": adminSessionCookie(
            request,
            createAdminSessionToken(),
          ),
        },
      );
    }

    if (request.method === "POST" && url.pathname === "/api/auth/logout") {
      if (!sameOrigin(request)) return apiError("Invalid request origin.", 403);
      return responseJson(
        { ok: true },
        200,
        { "set-cookie": clearAdminSessionCookie(request) },
      );
    }

    await ensureDatabase();

    if (
      request.method === "GET" &&
      segments[1] === "client" &&
      segments[2] === "reports" &&
      segments.length === 4
    ) {
      const report = await findClientReport(decodeURIComponent(segments[3]));
      if (!report) {
        return apiError(
          "This signing link is invalid, expired, or has been replaced.",
          404,
        );
      }
      const workspace = await readWorkspace();
      return responseJson({ report, company: workspace.company });
    }

    if (
      request.method === "POST" &&
      segments[1] === "client" &&
      segments[2] === "reports" &&
      segments[4] === "sign"
    ) {
      if (!sameOrigin(request)) return apiError("Invalid request origin.", 403);
      const token = decodeURIComponent(segments[3] ?? "");
      const report = await findClientReport(token);
      if (!report) {
        return apiError(
          "This signing link is invalid, expired, or has been replaced.",
          404,
        );
      }
      const payload = await jsonBody<Record<string, unknown>>(request);
      if (!payload) return apiError("A JSON request body is required.", 415);
      await signReport(report.id, payload, "client_portal");
      return responseJson({ report: await findReport(report.id) });
    }

    const admin = adminIdentity(request);
    if (!admin) return apiError("Promach administrator authentication required.", 401);

    if (request.method === "GET" && url.pathname === "/api/workspace") {
      return responseJson(await readWorkspace());
    }

    if (
      request.method === "POST" &&
      segments[1] === "master" &&
      segments.length === 3
    ) {
      if (!sameOrigin(request)) return apiError("Invalid request origin.", 403);
      const payload = await jsonBody<Record<string, unknown>>(request);
      if (!payload) return apiError("A JSON request body is required.", 415);
      await createMasterRecord(masterEntity(segments[2]), payload);
      return responseJson(await readWorkspace(), 201);
    }

    if (
      request.method === "PUT" &&
      segments[1] === "master" &&
      segments.length === 4
    ) {
      if (!sameOrigin(request)) return apiError("Invalid request origin.", 403);
      const payload = await jsonBody<Record<string, unknown>>(request);
      if (!payload) return apiError("A JSON request body is required.", 415);
      await updateMasterRecord(
        masterEntity(segments[2]),
        decodeURIComponent(segments[3]),
        payload,
      );
      return responseJson(await readWorkspace());
    }

    if (
      request.method === "DELETE" &&
      segments[1] === "master" &&
      segments.length === 4
    ) {
      if (!sameOrigin(request)) return apiError("Invalid request origin.", 403);
      await deleteMasterRecord(
        masterEntity(segments[2]),
        decodeURIComponent(segments[3]),
      );
      return responseJson(await readWorkspace());
    }

    if (request.method === "POST" && url.pathname === "/api/reports") {
      if (!sameOrigin(request)) return apiError("Invalid request origin.", 403);
      const payload = await jsonBody<CreateReportPayload>(request);
      if (!payload) return apiError("A JSON request body is required.", 415);
      const reportId = await createReport(payload, admin.name);
      const workspace = await readWorkspace();
      return responseJson(
        {
          report: workspace.reports.find((item) => item.id === reportId),
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
      const sharePath = await sendReport(segments[2], admin.name);
      return responseJson({ sharePath, workspace: await readWorkspace() });
    }

    if (
      request.method === "POST" &&
      segments[1] === "reports" &&
      segments[3] === "sign-admin"
    ) {
      if (!sameOrigin(request)) return apiError("Invalid request origin.", 403);
      const payload = await jsonBody<Record<string, unknown>>(request);
      if (!payload) return apiError("A JSON request body is required.", 415);
      await signReport(
        segments[2],
        payload,
        "admin_device",
        admin.name,
      );
      return responseJson({ workspace: await readWorkspace() });
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
