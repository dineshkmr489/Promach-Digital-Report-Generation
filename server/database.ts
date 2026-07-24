import type {
  AnyBulkWriteOperation,
  Collection,
  Filter,
  OptionalUnlessRequiredId,
} from "mongodb";
import { createInitialWorkspace } from "../app/workspaceSeed.ts";
import type {
  ChecklistTemplateRecord,
  ClientRecord,
  EquipmentRecord,
  LocationRecord,
  MasterEntity,
  ServiceTypeRecord,
  TechnicianRecord,
  WorkspaceReport,
  WorkspaceSnapshot,
} from "../app/workspaceTypes.ts";
import type { CompanyProfile } from "../app/reportData.ts";
import { mongoDatabase } from "./mongodb.ts";

export type MasterRecord =
  | ClientRecord
  | LocationRecord
  | EquipmentRecord
  | ChecklistTemplateRecord
  | TechnicianRecord
  | ServiceTypeRecord;

type StoredRecord<T extends { id: string }> = Omit<T, "id"> & { _id: string };
type StoredCompany = CompanyProfile & { _id: "promach" };
type StoredReport = StoredRecord<WorkspaceReport> & {
  shareTokenHash?: string | null;
};
type StoredState = {
  _id: string;
  initializedAt?: string;
  schemaVersion?: number;
  value?: number;
};

const collectionNames = {
  company: "company_profiles",
  clients: "clients",
  locations: "locations",
  equipment: "equipment",
  "checklist-templates": "checklist_templates",
  technicians: "technicians",
  "service-types": "service_types",
  reports: "service_reports",
  state: "system_state",
} as const;

function toStored<T extends { id: string }>(record: T): StoredRecord<T> {
  const { id, ...value } = record;
  return { _id: id, ...value } as StoredRecord<T>;
}

function fromStored<T extends { id: string }>(
  record: StoredRecord<T>,
): T {
  const { _id, ...value } = record;
  return { id: _id, ...value } as unknown as T;
}

function reportFromStored(record: StoredReport): WorkspaceReport {
  const report = { ...record };
  delete report.shareTokenHash;
  return fromStored<WorkspaceReport>(report);
}

async function seedRecords<T extends { id: string }>(
  collection: Collection<StoredRecord<T>>,
  records: T[],
): Promise<void> {
  if (!records.length) return;
  const operations = records.map((record) => ({
      updateOne: {
        filter: { _id: record.id } as Filter<StoredRecord<T>>,
        update: { $setOnInsert: toStored(record) },
        upsert: true,
      },
    })) as AnyBulkWriteOperation<StoredRecord<T>>[];
  await collection.bulkWrite(operations, { ordered: false });
}

export async function ensureDatabase(): Promise<void> {
  const db = await mongoDatabase();
  await Promise.all([
    db.collection(collectionNames["service-types"]).createIndex(
      { name: 1 },
      {
        name: "service_types_name_unique",
        unique: true,
        collation: { locale: "en", strength: 2 },
      },
    ),
    db.collection(collectionNames.reports).createIndex(
      { shareTokenHash: 1 },
      {
        name: "reports_share_token_unique",
        unique: true,
        sparse: true,
      },
    ),
    db
      .collection(collectionNames.locations)
      .createIndex({ clientId: 1 }, { name: "locations_client" }),
    db.collection(collectionNames.equipment).createIndex(
      { clientId: 1, locationId: 1 },
      { name: "equipment_client_location" },
    ),
    db
      .collection(collectionNames.reports)
      .createIndex({ status: 1 }, { name: "reports_status" }),
  ]);

  const stateCollection = db.collection<StoredState>(collectionNames.state);
  const initialized = await stateCollection.findOne({
    _id: "workspace-seed-v1",
  });
  const seed = createInitialWorkspace();
  if (!initialized) {
    await db.collection<StoredCompany>(collectionNames.company).updateOne(
      { _id: "promach" },
      {
        $setOnInsert: {
          _id: "promach",
          ...seed.company,
        } satisfies StoredCompany,
      },
      { upsert: true },
    );
    await Promise.all([
      seedRecords(
        db.collection<StoredRecord<ClientRecord>>(collectionNames.clients),
        seed.clients,
      ),
      seedRecords(
        db.collection<StoredRecord<LocationRecord>>(collectionNames.locations),
        seed.locations,
      ),
      seedRecords(
        db.collection<StoredRecord<EquipmentRecord>>(collectionNames.equipment),
        seed.equipment,
      ),
      seedRecords(
        db.collection<StoredRecord<ChecklistTemplateRecord>>(
          collectionNames["checklist-templates"],
        ),
        seed.checklistTemplates,
      ),
      seedRecords(
        db.collection<StoredRecord<TechnicianRecord>>(
          collectionNames.technicians,
        ),
        seed.technicians,
      ),
      seedRecords(
        db.collection<StoredRecord<ServiceTypeRecord>>(
          collectionNames["service-types"],
        ),
        seed.serviceTypes,
      ),
      seedRecords(
        db.collection<StoredReport>(collectionNames.reports),
        seed.reports,
      ),
    ]);
    await stateCollection.updateOne(
      { _id: "workspace-seed-v1" },
      {
        $setOnInsert: {
          _id: "workspace-seed-v1",
          initializedAt: new Date().toISOString(),
          schemaVersion: 1,
        },
      },
      { upsert: true },
    );
  }

  const removedSourceConcept = await stateCollection.findOne({
    _id: "remove-source-concept-v3",
  });
  if (!removedSourceConcept) {
    const reportsCollection = db.collection(collectionNames.reports);
    await Promise.all([
      reportsCollection.updateMany(
        {},
        {
          $unset: {
            sourceDocument: "",
            transcriptionNotes: "",
            "acknowledgement.source": "",
          },
        },
      ),
      reportsCollection.updateMany(
        { "signature.channel": "source_document" },
        {
          $set: {
            "signature.channel": "admin_device",
            "signature.consentText":
              "Customer acknowledgement recorded in Promach DSR.",
          },
        },
      ),
      reportsCollection.updateMany(
        { "auditTrail.channel": "source_document" },
        {
          $set: {
            "auditTrail.$[legacy].channel": "admin_portal",
            "auditTrail.$[legacy].action": "Historical report activity",
            "auditTrail.$[legacy].detail":
              "Report activity retained in the audit history.",
          },
        },
        { arrayFilters: [{ "legacy.channel": "source_document" }] },
      ),
      reportsCollection.updateMany(
        {},
        [
          {
            $set: {
              serviceType: {
                $cond: [
                  { $eq: ["$serviceType", "Not marked on source form"] },
                  "Regular Service",
                  "$serviceType",
                ],
              },
              remarks: {
                $cond: [
                  {
                    $eq: [
                      "$remarks",
                      "No remarks were entered on the source report.",
                    ],
                  },
                  "No additional remarks.",
                  "$remarks",
                ],
              },
              technicians: {
                $map: {
                  input: "$technicians",
                  as: "technician",
                  in: {
                    $trim: {
                      input: {
                        $replaceAll: {
                          input: "$$technician",
                          find: " (?)",
                          replacement: "",
                        },
                      },
                    },
                  },
                },
              },
              equipment: {
                $map: {
                  input: "$equipment",
                  as: "item",
                  in: {
                    $mergeObjects: [
                      "$$item",
                      {
                        model: {
                          $trim: {
                            input: {
                              $replaceAll: {
                                input: "$$item.model",
                                find: " (?)",
                                replacement: "",
                              },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
              acknowledgement: {
                $mergeObjects: [
                  "$acknowledgement",
                  {
                    name: {
                      $cond: [
                        {
                          $eq: [
                            "$acknowledgement.name",
                            "Customer name not legible on source scan",
                          ],
                        },
                        "Authorised Customer Representative",
                        "$acknowledgement.name",
                      ],
                    },
                  },
                ],
              },
              signature: {
                $cond: [
                  {
                    $eq: [
                      "$signature.signerName",
                      "Customer name not legible on source scan",
                    ],
                  },
                  {
                    $mergeObjects: [
                      "$signature",
                      { signerName: "Authorised Customer Representative" },
                    ],
                  },
                  "$signature",
                ],
              },
              auditTrail: {
                $map: {
                  input: "$auditTrail",
                  as: "event",
                  in: {
                    $mergeObjects: [
                      "$$event",
                      {
                        actorName: {
                          $cond: [
                            {
                              $eq: [
                                "$$event.actorName",
                                "Customer name not legible on source scan",
                              ],
                            },
                            "Authorised Customer Representative",
                            "$$event.actorName",
                          ],
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        ],
      ),
    ]);
    await stateCollection.updateOne(
      { _id: "remove-source-concept-v3" },
      {
        $setOnInsert: {
          _id: "remove-source-concept-v3",
          initializedAt: new Date().toISOString(),
          schemaVersion: 2,
        },
      },
      { upsert: true },
    );
  }

  const reportIds = await db
    .collection<StoredReport>(collectionNames.reports)
    .find({}, { projection: { _id: 1 } })
    .toArray();
  const highestReportNumber = reportIds.reduce(
    (maximum, report) =>
      Math.max(maximum, Number.parseInt(String(report._id), 10) || 0),
    4122,
  );
  await stateCollection.updateOne(
    { _id: "report-number" },
    { $max: { value: highestReportNumber } },
    { upsert: true },
  );
}

async function storedRecords<T extends { id: string }>(
  collectionName: string,
): Promise<T[]> {
  const db = await mongoDatabase();
  const records = await db
    .collection<StoredRecord<T>>(collectionName)
    .find({})
    .toArray();
  return records.map((record) =>
    fromStored<T>(record as unknown as StoredRecord<T>),
  );
}

export async function readWorkspace(): Promise<WorkspaceSnapshot> {
  await ensureDatabase();
  const db = await mongoDatabase();
  const [
    companyDocument,
    clients,
    locations,
    equipment,
    checklistTemplates,
    technicians,
    serviceTypes,
    storedReports,
  ] = await Promise.all([
    db.collection<StoredCompany>(collectionNames.company).findOne({
      _id: "promach",
    }),
    storedRecords<ClientRecord>(collectionNames.clients),
    storedRecords<LocationRecord>(collectionNames.locations),
    storedRecords<EquipmentRecord>(collectionNames.equipment),
    storedRecords<ChecklistTemplateRecord>(
      collectionNames["checklist-templates"],
    ),
    storedRecords<TechnicianRecord>(collectionNames.technicians),
    storedRecords<ServiceTypeRecord>(collectionNames["service-types"]),
    db
      .collection<StoredReport>(collectionNames.reports)
      .find({})
      .toArray(),
  ]);
  if (!companyDocument) throw new Error("Company profile is not initialized.");
  const company: CompanyProfile = {
    name: companyDocument.name,
    address: companyDocument.address,
    phone: companyDocument.phone,
    email: companyDocument.email,
    website: companyDocument.website,
    registration: companyDocument.registration,
  };
  const byName = <T extends { name: string }>(left: T, right: T) =>
    left.name.localeCompare(right.name);
  return {
    company,
    clients: clients.sort(byName),
    locations: locations.sort(byName),
    equipment: equipment.sort(byName),
    checklistTemplates: checklistTemplates.sort(byName),
    technicians: technicians.sort(byName),
    serviceTypes: serviceTypes.sort(byName),
    reports: storedReports
      .map(reportFromStored)
      .sort((left, right) => Number(right.id) - Number(left.id)),
  };
}

function masterCollectionName(entity: MasterEntity): string {
  return collectionNames[entity];
}

export async function findMasterRecord(
  entity: MasterEntity,
  id: string,
): Promise<MasterRecord | null> {
  const db = await mongoDatabase();
  const stored = await db
    .collection<StoredRecord<MasterRecord>>(masterCollectionName(entity))
    .findOne({ _id: id });
  return stored ? fromStored<MasterRecord>(stored) : null;
}

export async function insertMasterRecord(
  entity: MasterEntity,
  record: MasterRecord,
): Promise<void> {
  const db = await mongoDatabase();
  await db
    .collection<StoredRecord<MasterRecord>>(masterCollectionName(entity))
    .insertOne(
      toStored(record) as OptionalUnlessRequiredId<StoredRecord<MasterRecord>>,
    );
}

export async function replaceMasterRecord(
  entity: MasterEntity,
  id: string,
  record: MasterRecord,
): Promise<boolean> {
  const db = await mongoDatabase();
  const result = await db
    .collection<StoredRecord<MasterRecord>>(masterCollectionName(entity))
    .replaceOne({ _id: id }, toStored(record));
  return result.matchedCount === 1;
}

export async function removeMasterRecord(
  entity: MasterEntity,
  id: string,
): Promise<boolean> {
  const db = await mongoDatabase();
  const result = await db
    .collection<{ _id: string }>(masterCollectionName(entity))
    .deleteOne({ _id: id });
  return result.deletedCount === 1;
}

export async function serviceTypeNameExists(
  name: string,
  excludedId?: string,
): Promise<boolean> {
  const db = await mongoDatabase();
  const filter: Filter<StoredRecord<ServiceTypeRecord>> = {
    name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
  };
  if (excludedId) filter._id = { $ne: excludedId };
  return Boolean(
    await db
      .collection<StoredRecord<ServiceTypeRecord>>(
        collectionNames["service-types"],
      )
      .findOne(filter, { projection: { _id: 1 } }),
  );
}

export async function nextReportNumber(): Promise<string> {
  const db = await mongoDatabase();
  const counter = await db
    .collection<StoredState>(collectionNames.state)
    .findOneAndUpdate(
      { _id: "report-number" },
      { $inc: { value: 1 } },
      { upsert: true, returnDocument: "after" },
    );
  if (!counter?.value) {
    throw new Error("Unable to allocate a service report number.");
  }
  return String(counter.value);
}

export async function insertReport(report: WorkspaceReport): Promise<void> {
  const db = await mongoDatabase();
  await db
    .collection<StoredReport>(collectionNames.reports)
    .insertOne(toStored(report) as OptionalUnlessRequiredId<StoredReport>);
}

export async function findReport(
  reportId: string,
): Promise<WorkspaceReport | null> {
  const db = await mongoDatabase();
  const report = await db
    .collection<StoredReport>(collectionNames.reports)
    .findOne({ _id: reportId });
  return report ? reportFromStored(report) : null;
}

export async function issueReportShareLink(
  reportId: string,
  shareTokenHash: string,
  sentAt: string,
  auditEvent: WorkspaceReport["auditTrail"][number],
): Promise<"updated" | "missing" | "locked"> {
  const db = await mongoDatabase();
  const collection = db.collection<StoredReport>(collectionNames.reports);
  const current = await collection.findOne(
    { _id: reportId },
    { projection: { status: 1 } },
  );
  if (!current) return "missing";
  if (
    !["Draft", "Correction required", "Awaiting client signature"].includes(
      current.status,
    )
  ) {
    return "locked";
  }
  const result = await collection.updateOne(
    { _id: reportId, status: current.status },
    {
      $set: {
        status: "Awaiting client signature",
        shareTokenHash,
        sentAt,
      },
      $push: { auditTrail: auditEvent },
    },
  );
  return result.modifiedCount === 1 ? "updated" : "locked";
}

export async function findReportByShareHash(
  shareTokenHash: string,
): Promise<WorkspaceReport | null> {
  const db = await mongoDatabase();
  const report = await db
    .collection<StoredReport>(collectionNames.reports)
    .findOne({
      shareTokenHash,
      status: { $in: ["Awaiting client signature", "Completed"] },
    });
  return report ? reportFromStored(report) : null;
}

export async function completeReportSignature(
  reportId: string,
  signature: NonNullable<WorkspaceReport["signature"]>,
  acknowledgement: WorkspaceReport["acknowledgement"],
  auditEvent: WorkspaceReport["auditTrail"][number],
): Promise<"updated" | "missing" | "invalid-status"> {
  const db = await mongoDatabase();
  const collection = db.collection<StoredReport>(collectionNames.reports);
  const current = await collection.findOne(
    { _id: reportId },
    { projection: { status: 1 } },
  );
  if (!current) return "missing";
  if (current.status !== "Awaiting client signature") return "invalid-status";
  const result = await collection.updateOne(
    { _id: reportId, status: "Awaiting client signature" },
    {
      $set: {
        signature,
        acknowledgement,
        status: "Completed",
      },
      $push: { auditTrail: auditEvent },
    },
  );
  return result.modifiedCount === 1 ? "updated" : "invalid-status";
}
