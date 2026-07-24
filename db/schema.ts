import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const clients = sqliteTable("clients", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  contactName: text("contact_name").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  address: text("address").notNull().default(""),
  active: integer("active").notNull().default(1),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const locations = sqliteTable("locations", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull().references(() => clients.id),
  name: text("name").notNull(),
  address: text("address").notNull().default(""),
  active: integer("active").notNull().default(1),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const checklistTemplates = sqliteTable("checklist_templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  equipmentType: text("equipment_type").notNull(),
  itemsJson: text("items_json").notNull(),
  measurementsJson: text("measurements_json").notNull().default("[]"),
  active: integer("active").notNull().default(1),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const equipment = sqliteTable("equipment", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull().references(() => clients.id),
  locationId: text("location_id").notNull().references(() => locations.id),
  name: text("name").notNull(),
  type: text("type").notNull(),
  brand: text("brand").notNull().default(""),
  model: text("model").notNull().default(""),
  serial: text("serial").notNull().default(""),
  checklistTemplateId: text("checklist_template_id")
    .notNull()
    .references(() => checklistTemplates.id),
  active: integer("active").notNull().default(1),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const technicians = sqliteTable("technicians", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  designation: text("designation").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  active: integer("active").notNull().default(1),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const serviceTypes = sqliteTable(
  "service_types",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    active: integer("active").notNull().default(1),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("service_types_name_idx").on(table.name)],
);

export const serviceReports = sqliteTable(
  "service_reports",
  {
    reportNo: text("report_no").primaryKey(),
    clientId: text("client_id").notNull().references(() => clients.id),
    locationId: text("location_id").notNull().references(() => locations.id),
    clientNameSnapshot: text("client_name_snapshot").notNull(),
    addressSnapshot: text("address_snapshot").notNull(),
    serviceDate: text("service_date").notNull(),
    serviceMonth: text("service_month").notNull(),
    serviceType: text("service_type").notNull(),
    status: text("status").notNull(),
    condition: text("condition").notNull(),
    summary: text("summary").notNull(),
    workPerformedJson: text("work_performed_json").notNull(),
    equipmentJson: text("equipment_json").notNull(),
    technicianIdsJson: text("technician_ids_json").notNull(),
    techniciansJson: text("technicians_json").notNull(),
    remarks: text("remarks").notNull().default(""),
    followUp: text("follow_up").notNull().default(""),
    acknowledgementJson: text("acknowledgement_json").notNull(),
    sourceDocumentJson: text("source_document_json"),
    transcriptionNotesJson: text("transcription_notes_json").notNull().default("[]"),
    shareTokenHash: text("share_token_hash"),
    sentAt: text("sent_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("reports_share_token_idx").on(table.shareTokenHash),
  ],
);

export const reportSignatures = sqliteTable(
  "report_signatures",
  {
    id: text("id").primaryKey(),
    reportNo: text("report_no").notNull().references(() => serviceReports.reportNo),
    signerName: text("signer_name").notNull(),
    signerEmail: text("signer_email").notNull().default(""),
    designation: text("designation").notNull().default(""),
    signedAt: text("signed_at").notNull(),
    channel: text("channel").notNull(),
    signatureDataUrl: text("signature_data_url"),
    consentText: text("consent_text").notNull(),
  },
  (table) => [uniqueIndex("signature_report_idx").on(table.reportNo)],
);

export const auditEvents = sqliteTable("audit_events", {
  id: text("id").primaryKey(),
  reportNo: text("report_no").notNull().references(() => serviceReports.reportNo),
  action: text("action").notNull(),
  actorName: text("actor_name").notNull(),
  channel: text("channel").notNull(),
  detail: text("detail").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
