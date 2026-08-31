import { createInitialWorkspace } from "../app/workspaceSeed.ts";
import type {
  ChecklistTemplateRecord,
  ClientRecord,
  EquipmentRecord,
  LocationRecord,
  MasterEntity,
  UserRecord,
  ServiceTypeRecord,
  TechnicianRecord,
  WorkspaceReport,
  WorkspaceSnapshot,
} from "../app/workspaceTypes.ts";
import type { CompanyProfile } from "../app/reportData.ts";
import { hashPassword, verifyPassword } from "./adminAuth.ts";
import { query } from "./postgres.ts";

export type MasterRecord =
  | ClientRecord
  | LocationRecord
  | EquipmentRecord
  | ChecklistTemplateRecord
  | TechnicianRecord
  | ServiceTypeRecord;

type StoredUserRow = {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  name: string;
  phone: string | null;
  designation: string | null;
  role: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

const tableNames: Record<MasterEntity, string> = {
  clients: "clients",
  locations: "locations",
  equipment: "equipment",
  "checklist-templates": "checklist_templates",
  technicians: "technicians",
  "service-types": "service_types",
};

function userFromRow(row: StoredUserRow): UserRecord {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    email: row.email,
    phone: row.phone || "",
    designation: row.designation || "",
    role: row.role as UserRecord["role"],
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function ensureDatabase(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS company_profiles (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL
    );

    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      data JSONB NOT NULL
    );

    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      name TEXT NOT NULL,
      data JSONB NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_locations_client ON locations(client_id);

    CREATE TABLE IF NOT EXISTS equipment (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      location_id TEXT NOT NULL,
      name TEXT NOT NULL,
      data JSONB NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_equipment_client_location ON equipment(client_id, location_id);

    CREATE TABLE IF NOT EXISTS checklist_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      data JSONB NOT NULL
    );

    CREATE TABLE IF NOT EXISTS technicians (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      data JSONB NOT NULL
    );

    CREATE TABLE IF NOT EXISTS service_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      active BOOLEAN NOT NULL DEFAULT true,
      data JSONB NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_service_types_name_unique ON service_types(LOWER(name));

    CREATE TABLE IF NOT EXISTS service_reports (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      share_token_hash TEXT,
      data JSONB NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_service_reports_share_token ON service_reports(share_token_hash) WHERE share_token_hash IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_service_reports_status ON service_reports(status);

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      designation TEXT,
      role TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique ON users(LOWER(username));
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(LOWER(email));

    CREATE TABLE IF NOT EXISTS system_state (
      id TEXT PRIMARY KEY,
      value BIGINT,
      schema_version INT,
      initialized_at TEXT
    );
  `);

  const initCheck = await query<{ id: string }>(
    "SELECT id FROM system_state WHERE id = 'workspace-seed-v1';",
  );

  if (initCheck.rowCount === 0) {
    const seed = createInitialWorkspace();

    await query(
      `INSERT INTO company_profiles (id, data) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING;`,
      ["promach", JSON.stringify({ id: "promach", ...seed.company })],
    );

    for (const client of seed.clients) {
      await query(
        `INSERT INTO clients (id, name, data) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING;`,
        [client.id, client.name, JSON.stringify(client)],
      );
    }
    for (const location of seed.locations) {
      await query(
        `INSERT INTO locations (id, client_id, name, data) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING;`,
        [location.id, location.clientId, location.name, JSON.stringify(location)],
      );
    }
    for (const eq of seed.equipment) {
      await query(
        `INSERT INTO equipment (id, client_id, location_id, name, data) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING;`,
        [eq.id, eq.clientId, eq.locationId, eq.name, JSON.stringify(eq)],
      );
    }
    for (const template of seed.checklistTemplates) {
      await query(
        `INSERT INTO checklist_templates (id, name, data) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING;`,
        [template.id, template.name, JSON.stringify(template)],
      );
    }
    for (const tech of seed.technicians) {
      await query(
        `INSERT INTO technicians (id, name, data) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING;`,
        [tech.id, tech.name, JSON.stringify(tech)],
      );
    }
    for (const st of seed.serviceTypes) {
      await query(
        `INSERT INTO service_types (id, name, description, active, data) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING;`,
        [st.id, st.name, st.description, st.active, JSON.stringify(st)],
      );
    }
    for (const rep of seed.reports) {
      await query(
        `INSERT INTO service_reports (id, status, share_token_hash, data) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING;`,
        [rep.id, rep.status, null, JSON.stringify(rep)],
      );
    }

    await query(
      `INSERT INTO system_state (id, schema_version, initialized_at) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING;`,
      ["workspace-seed-v1", 1, new Date().toISOString()],
    );
  }

  const username = process.env.ADMIN_USERNAME?.trim() || "promach-admin";
  const password = process.env.ADMIN_PASSWORD;
  if (password) {
    const existingUser = await query<{ id: string }>(
      "SELECT id FROM users WHERE LOWER(username) = LOWER($1);",
      [username],
    );
    if (existingUser.rowCount === 0) {
      const now = new Date().toISOString();
      await query(
        `INSERT INTO users (id, username, email, password_hash, name, phone, designation, role, active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO NOTHING;`,
        [
          `bootstrap-${username}`,
          username,
          process.env.ADMIN_EMAIL?.trim() || `${username}@promach.local`,
          hashPassword(password),
          process.env.ADMIN_NAME?.trim() || "Promach Admin",
          "",
          "System Administrator",
          "Administrator",
          true,
          now,
          now,
        ],
      );
    }
  }

  const reportIdsRes = await query<{ id: string }>(
    "SELECT id FROM service_reports;",
  );
  const highestReportNumber = reportIdsRes.rows.reduce(
    (maximum, row) =>
      Math.max(maximum, Number.parseInt(String(row.id), 10) || 0),
    4122,
  );

  await query(
    `INSERT INTO system_state (id, value)
     VALUES ('report-number', $1)
     ON CONFLICT (id) DO UPDATE SET value = GREATEST(system_state.value, EXCLUDED.value);`,
    [highestReportNumber],
  );
}

export async function readWorkspace(): Promise<WorkspaceSnapshot> {
  await ensureDatabase();
  const [
    companyRes,
    clientsRes,
    locationsRes,
    equipmentRes,
    templatesRes,
    techsRes,
    typesRes,
    reportsRes,
  ] = await Promise.all([
    query<{ data: CompanyProfile }>(
      "SELECT data FROM company_profiles WHERE id = 'promach';",
    ),
    query<{ data: ClientRecord }>("SELECT data FROM clients ORDER BY name ASC;"),
    query<{ data: LocationRecord }>(
      "SELECT data FROM locations ORDER BY name ASC;",
    ),
    query<{ data: EquipmentRecord }>(
      "SELECT data FROM equipment ORDER BY name ASC;",
    ),
    query<{ data: ChecklistTemplateRecord }>(
      "SELECT data FROM checklist_templates ORDER BY name ASC;",
    ),
    query<{ data: TechnicianRecord }>(
      "SELECT data FROM technicians ORDER BY name ASC;",
    ),
    query<{ data: ServiceTypeRecord }>(
      "SELECT data FROM service_types ORDER BY name ASC;",
    ),
    query<{ data: WorkspaceReport }>(
      "SELECT data FROM service_reports ORDER BY (CASE WHEN id ~ '^[0-9]+$' THEN id::bigint ELSE 0 END) DESC;",
    ),
  ]);

  if (!companyRes.rows[0]?.data) {
    throw new Error("Company profile is not initialized.");
  }

  const companyDoc = companyRes.rows[0].data;
  const company: CompanyProfile = {
    name: companyDoc.name,
    address: companyDoc.address,
    phone: companyDoc.phone,
    email: companyDoc.email,
    website: companyDoc.website,
    registration: companyDoc.registration,
  };

  return {
    company,
    clients: clientsRes.rows.map((r) => r.data),
    locations: locationsRes.rows.map((r) => r.data),
    equipment: equipmentRes.rows.map((r) => r.data),
    checklistTemplates: templatesRes.rows.map((r) => r.data),
    technicians: techsRes.rows.map((r) => r.data),
    serviceTypes: typesRes.rows.map((r) => r.data),
    reports: reportsRes.rows.map((r) => {
      const rep = { ...r.data };
      delete (rep as { shareTokenHash?: string | null }).shareTokenHash;
      return rep;
    }),
  };
}

export async function findMasterRecord(
  entity: MasterEntity,
  id: string,
): Promise<MasterRecord | null> {
  const table = tableNames[entity];
  const res = await query<{ data: MasterRecord }>(
    `SELECT data FROM ${table} WHERE id = $1;`,
    [id],
  );
  return res.rows[0]?.data || null;
}

export async function insertMasterRecord(
  entity: MasterEntity,
  record: MasterRecord,
): Promise<void> {
  const table = tableNames[entity];
  const id = record.id;
  const name = record.name;
  const data = JSON.stringify(record);

  if (entity === "locations") {
    const loc = record as LocationRecord;
    await query(
      `INSERT INTO locations (id, client_id, name, data) VALUES ($1, $2, $3, $4);`,
      [id, loc.clientId, name, data],
    );
  } else if (entity === "equipment") {
    const eq = record as EquipmentRecord;
    await query(
      `INSERT INTO equipment (id, client_id, location_id, name, data) VALUES ($1, $2, $3, $4, $5);`,
      [id, eq.clientId, eq.locationId, name, data],
    );
  } else if (entity === "service-types") {
    const st = record as ServiceTypeRecord;
    await query(
      `INSERT INTO service_types (id, name, description, active, data) VALUES ($1, $2, $3, $4, $5);`,
      [id, name, st.description, st.active, data],
    );
  } else {
    await query(
      `INSERT INTO ${table} (id, name, data) VALUES ($1, $2, $3);`,
      [id, name, data],
    );
  }
}

export async function replaceMasterRecord(
  entity: MasterEntity,
  id: string,
  record: MasterRecord,
): Promise<boolean> {
  const table = tableNames[entity];
  const name = record.name;
  const data = JSON.stringify(record);

  let res;
  if (entity === "locations") {
    const loc = record as LocationRecord;
    res = await query(
      `UPDATE locations SET client_id = $2, name = $3, data = $4 WHERE id = $1;`,
      [id, loc.clientId, name, data],
    );
  } else if (entity === "equipment") {
    const eq = record as EquipmentRecord;
    res = await query(
      `UPDATE equipment SET client_id = $2, location_id = $3, name = $4, data = $5 WHERE id = $1;`,
      [id, eq.clientId, eq.locationId, name, data],
    );
  } else if (entity === "service-types") {
    const st = record as ServiceTypeRecord;
    res = await query(
      `UPDATE service_types SET name = $2, description = $3, active = $4, data = $5 WHERE id = $1;`,
      [id, name, st.description, st.active, data],
    );
  } else {
    res = await query(
      `UPDATE ${table} SET name = $2, data = $3 WHERE id = $1;`,
      [id, name, data],
    );
  }

  return (res.rowCount ?? 0) === 1;
}

export async function removeMasterRecord(
  entity: MasterEntity,
  id: string,
): Promise<boolean> {
  const table = tableNames[entity];
  const res = await query(`DELETE FROM ${table} WHERE id = $1;`, [id]);
  return (res.rowCount ?? 0) === 1;
}

export async function serviceTypeNameExists(
  name: string,
  excludedId?: string,
): Promise<boolean> {
  const res = await query<{ id: string }>(
    `SELECT id FROM service_types WHERE LOWER(name) = LOWER($1) AND ($2::text IS NULL OR id != $2);`,
    [name.trim(), excludedId || null],
  );
  return res.rowCount !== null && res.rowCount > 0;
}

export async function nextReportNumber(): Promise<string> {
  const res = await query<{ value: string }>(
    `INSERT INTO system_state (id, value)
     VALUES ('report-number', 4123)
     ON CONFLICT (id) DO UPDATE SET value = system_state.value + 1
     RETURNING value;`,
  );
  if (!res.rows[0]?.value) {
    throw new Error("Unable to allocate a service report number.");
  }
  return String(res.rows[0].value);
}

export async function insertReport(report: WorkspaceReport): Promise<void> {
  await query(
    `INSERT INTO service_reports (id, status, share_token_hash, data) VALUES ($1, $2, $3, $4);`,
    [report.id, report.status, null, JSON.stringify(report)],
  );
}

export async function findReport(
  reportId: string,
): Promise<WorkspaceReport | null> {
  const res = await query<{ data: WorkspaceReport }>(
    `SELECT data FROM service_reports WHERE id = $1;`,
    [reportId],
  );
  if (!res.rows[0]?.data) return null;
  const rep = { ...res.rows[0].data };
  delete (rep as { shareTokenHash?: string | null }).shareTokenHash;
  return rep;
}

export async function issueReportShareLink(
  reportId: string,
  shareTokenHash: string,
  sentAt: string,
  auditEvent: WorkspaceReport["auditTrail"][number],
): Promise<"updated" | "missing" | "locked"> {
  const currentRes = await query<{ status: string; data: WorkspaceReport }>(
    `SELECT status, data FROM service_reports WHERE id = $1;`,
    [reportId],
  );
  if (currentRes.rowCount === 0) return "missing";
  const current = currentRes.rows[0];
  if (
    !["Draft", "Correction required", "Awaiting client signature"].includes(
      current.status,
    )
  ) {
    return "locked";
  }

  const updatedReport: WorkspaceReport = {
    ...current.data,
    status: "Awaiting client signature",
    sentAt,
    auditTrail: [...(current.data.auditTrail || []), auditEvent],
  };

  const res = await query(
    `UPDATE service_reports
     SET status = 'Awaiting client signature',
         share_token_hash = $2,
         data = $3
     WHERE id = $1 AND status = $4;`,
    [reportId, shareTokenHash, JSON.stringify(updatedReport), current.status],
  );

  return (res.rowCount ?? 0) === 1 ? "updated" : "locked";
}

export async function findReportByShareHash(
  shareTokenHash: string,
): Promise<WorkspaceReport | null> {
  const res = await query<{ data: WorkspaceReport }>(
    `SELECT data FROM service_reports
     WHERE share_token_hash = $1 AND status IN ('Awaiting client signature', 'Completed');`,
    [shareTokenHash],
  );
  if (!res.rows[0]?.data) return null;
  const rep = { ...res.rows[0].data };
  delete (rep as { shareTokenHash?: string | null }).shareTokenHash;
  return rep;
}

export async function completeReportSignature(
  reportId: string,
  signature: NonNullable<WorkspaceReport["signature"]>,
  acknowledgement: WorkspaceReport["acknowledgement"],
  auditEvent: WorkspaceReport["auditTrail"][number],
): Promise<"updated" | "missing" | "invalid-status"> {
  const currentRes = await query<{ status: string; data: WorkspaceReport }>(
    `SELECT status, data FROM service_reports WHERE id = $1;`,
    [reportId],
  );
  if (currentRes.rowCount === 0) return "missing";
  const current = currentRes.rows[0];
  if (current.status !== "Awaiting client signature") return "invalid-status";

  const updatedReport: WorkspaceReport = {
    ...current.data,
    status: "Completed",
    signature,
    acknowledgement,
    auditTrail: [...(current.data.auditTrail || []), auditEvent],
  };

  const res = await query(
    `UPDATE service_reports
     SET status = 'Completed',
         data = $2
     WHERE id = $1 AND status = 'Awaiting client signature';`,
    [reportId, JSON.stringify(updatedReport)],
  );

  return (res.rowCount ?? 0) === 1 ? "updated" : "invalid-status";
}

export async function authenticateUser(
  username: string,
  password: string,
): Promise<UserRecord | null> {
  const res = await query<StoredUserRow>(
    `SELECT * FROM users WHERE LOWER(username) = LOWER($1) AND active = true;`,
    [username.trim()],
  );
  const user = res.rows[0];
  if (!user || !verifyPassword(password, user.password_hash)) {
    return null;
  }
  return userFromRow(user);
}

export async function readUsers(): Promise<UserRecord[]> {
  const res = await query<StoredUserRow>(
    `SELECT * FROM users ORDER BY name ASC;`,
  );
  return res.rows.map(userFromRow);
}

export async function findUser(userId: string): Promise<UserRecord | null> {
  const res = await query<StoredUserRow>(
    `SELECT * FROM users WHERE id = $1;`,
    [userId],
  );
  return res.rows[0] ? userFromRow(res.rows[0]) : null;
}

export async function insertUser(
  record: UserRecord,
  password: string,
): Promise<void> {
  await query(
    `INSERT INTO users (id, username, email, password_hash, name, phone, designation, role, active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`,
    [
      record.id,
      record.username,
      record.email,
      hashPassword(password),
      record.name,
      record.phone || "",
      record.designation || "",
      record.role,
      record.active,
      record.createdAt,
      record.updatedAt,
    ],
  );
}

export async function replaceUser(
  userId: string,
  record: UserRecord,
  password?: string,
): Promise<boolean> {
  let res;
  if (password) {
    res = await query(
      `UPDATE users
       SET username = $2,
           email = $3,
           name = $4,
           phone = $5,
           designation = $6,
           role = $7,
           active = $8,
           updated_at = $9,
           password_hash = $10
       WHERE id = $1;`,
      [
        userId,
        record.username,
        record.email,
        record.name,
        record.phone || "",
        record.designation || "",
        record.role,
        record.active,
        record.updatedAt,
        hashPassword(password),
      ],
    );
  } else {
    res = await query(
      `UPDATE users
       SET username = $2,
           email = $3,
           name = $4,
           phone = $5,
           designation = $6,
           role = $7,
           active = $8,
           updated_at = $9
       WHERE id = $1;`,
      [
        userId,
        record.username,
        record.email,
        record.name,
        record.phone || "",
        record.designation || "",
        record.role,
        record.active,
        record.updatedAt,
      ],
    );
  }
  return (res.rowCount ?? 0) === 1;
}

export async function updateUserProfile(
  userId: string,
  values: Pick<UserRecord, "name" | "email" | "phone" | "designation">,
  password?: string,
): Promise<UserRecord | null> {
  const now = new Date().toISOString();
  let res;
  if (password) {
    res = await query<StoredUserRow>(
      `UPDATE users
       SET name = $2,
           email = $3,
           phone = $4,
           designation = $5,
           updated_at = $6,
           password_hash = $7
       WHERE id = $1 AND active = true
       RETURNING *;`,
      [
        userId,
        values.name,
        values.email,
        values.phone || "",
        values.designation || "",
        now,
        hashPassword(password),
      ],
    );
  } else {
    res = await query<StoredUserRow>(
      `UPDATE users
       SET name = $2,
           email = $3,
           phone = $4,
           designation = $5,
           updated_at = $6
       WHERE id = $1 AND active = true
       RETURNING *;`,
      [
        userId,
        values.name,
        values.email,
        values.phone || "",
        values.designation || "",
        now,
      ],
    );
  }
  return res.rows[0] ? userFromRow(res.rows[0]) : null;
}

export async function removeUser(userId: string): Promise<boolean> {
  const res = await query(`DELETE FROM users WHERE id = $1;`, [userId]);
  return (res.rowCount ?? 0) === 1;
}

export async function userLoginExists(
  username: string,
  email: string,
  excludedId?: string,
): Promise<"username" | "email" | null> {
  const userRes = await query<{ id: string }>(
    `SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND ($2::text IS NULL OR id != $2);`,
    [username.trim(), excludedId || null],
  );
  if ((userRes.rowCount ?? 0) > 0) return "username";

  const emailRes = await query<{ id: string }>(
    `SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND ($2::text IS NULL OR id != $2);`,
    [email.trim(), excludedId || null],
  );
  if ((emailRes.rowCount ?? 0) > 0) return "email";

  return null;
}
