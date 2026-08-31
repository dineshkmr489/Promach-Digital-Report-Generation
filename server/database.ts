import {
  CreateTableCommand,
  DescribeTableCommand,
  ResourceNotFoundException,
} from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
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
import {
  dynamoClient,
  dynamoDocClient,
  tableNames,
} from "./dynamodb.ts";

export type MasterRecord =
  | ClientRecord
  | LocationRecord
  | EquipmentRecord
  | ChecklistTemplateRecord
  | TechnicianRecord
  | ServiceTypeRecord;

type StoredUser = Omit<UserRecord, "id"> & {
  id: string;
  passwordHash: string;
};

type StoredReport = WorkspaceReport & {
  shareTokenHash?: string | null;
};


function userFromStored(stored: StoredUser): UserRecord {
  return {
    id: stored.id,
    username: stored.username,
    name: stored.name,
    email: stored.email,
    phone: stored.phone || "",
    designation: stored.designation || "",
    role: stored.role,
    active: stored.active,
    createdAt: stored.createdAt,
    updatedAt: stored.updatedAt,
  };
}

function cleanReport(record: StoredReport): WorkspaceReport {
  const report = { ...record };
  delete report.shareTokenHash;
  return report;
}

async function waitForTable(tableName: string): Promise<void> {
  const ddb = dynamoClient();
  for (let i = 0; i < 30; i++) {
    try {
      const res = await ddb.send(
        new DescribeTableCommand({ TableName: tableName }),
      );
      if (res.Table?.TableStatus === "ACTIVE") return;
    } catch {
      // Waiting
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
}

async function ensureTable(params: {
  TableName: string;
  KeySchema: { AttributeName: string; KeyType: "HASH" | "RANGE" }[];
  AttributeDefinitions: { AttributeName: string; AttributeType: "S" | "N" }[];
  GlobalSecondaryIndexes?: {
    IndexName: string;
    KeySchema: { AttributeName: string; KeyType: "HASH" | "RANGE" }[];
    Projection: { ProjectionType: "ALL" };
  }[];
  BillingMode: "PAY_PER_REQUEST";
}): Promise<void> {
  const ddb = dynamoClient();
  try {
    const res = await ddb.send(
      new DescribeTableCommand({ TableName: params.TableName }),
    );
    if (res.Table?.TableStatus === "CREATING") {
      await waitForTable(params.TableName);
    }
  } catch (error) {
    if (
      error instanceof ResourceNotFoundException ||
      (error as { name?: string }).name === "ResourceNotFoundException"
    ) {
      await ddb.send(new CreateTableCommand(params));
      await waitForTable(params.TableName);
    } else {
      throw error;
    }
  }
}

export async function ensureDatabase(): Promise<void> {
  await Promise.all([
    ensureTable({
      TableName: tableNames.company,
      KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
      AttributeDefinitions: [{ AttributeName: "id", AttributeType: "S" }],
      BillingMode: "PAY_PER_REQUEST",
    }),
    ensureTable({
      TableName: tableNames.clients,
      KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
      AttributeDefinitions: [{ AttributeName: "id", AttributeType: "S" }],
      BillingMode: "PAY_PER_REQUEST",
    }),
    ensureTable({
      TableName: tableNames.locations,
      KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
      AttributeDefinitions: [
        { AttributeName: "id", AttributeType: "S" },
        { AttributeName: "clientId", AttributeType: "S" },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: "clientId-index",
          KeySchema: [{ AttributeName: "clientId", KeyType: "HASH" }],
          Projection: { ProjectionType: "ALL" },
        },
      ],
      BillingMode: "PAY_PER_REQUEST",
    }),
    ensureTable({
      TableName: tableNames.equipment,
      KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
      AttributeDefinitions: [
        { AttributeName: "id", AttributeType: "S" },
        { AttributeName: "clientId", AttributeType: "S" },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: "clientId-index",
          KeySchema: [{ AttributeName: "clientId", KeyType: "HASH" }],
          Projection: { ProjectionType: "ALL" },
        },
      ],
      BillingMode: "PAY_PER_REQUEST",
    }),
    ensureTable({
      TableName: tableNames["checklist-templates"],
      KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
      AttributeDefinitions: [{ AttributeName: "id", AttributeType: "S" }],
      BillingMode: "PAY_PER_REQUEST",
    }),
    ensureTable({
      TableName: tableNames.technicians,
      KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
      AttributeDefinitions: [{ AttributeName: "id", AttributeType: "S" }],
      BillingMode: "PAY_PER_REQUEST",
    }),
    ensureTable({
      TableName: tableNames["service-types"],
      KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
      AttributeDefinitions: [{ AttributeName: "id", AttributeType: "S" }],
      BillingMode: "PAY_PER_REQUEST",
    }),
    ensureTable({
      TableName: tableNames.reports,
      KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
      AttributeDefinitions: [
        { AttributeName: "id", AttributeType: "S" },
        { AttributeName: "shareTokenHash", AttributeType: "S" },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: "shareTokenHash-index",
          KeySchema: [{ AttributeName: "shareTokenHash", KeyType: "HASH" }],
          Projection: { ProjectionType: "ALL" },
        },
      ],
      BillingMode: "PAY_PER_REQUEST",
    }),
    ensureTable({
      TableName: tableNames.users,
      KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
      AttributeDefinitions: [
        { AttributeName: "id", AttributeType: "S" },
        { AttributeName: "username", AttributeType: "S" },
        { AttributeName: "email", AttributeType: "S" },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: "username-index",
          KeySchema: [{ AttributeName: "username", KeyType: "HASH" }],
          Projection: { ProjectionType: "ALL" },
        },
        {
          IndexName: "email-index",
          KeySchema: [{ AttributeName: "email", KeyType: "HASH" }],
          Projection: { ProjectionType: "ALL" },
        },
      ],
      BillingMode: "PAY_PER_REQUEST",
    }),
    ensureTable({
      TableName: tableNames.state,
      KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
      AttributeDefinitions: [{ AttributeName: "id", AttributeType: "S" }],
      BillingMode: "PAY_PER_REQUEST",
    }),
  ]);

  const docClient = dynamoDocClient();
  const initCheck = await docClient.send(
    new GetCommand({
      TableName: tableNames.state,
      Key: { id: "workspace-seed-v1" },
    }),
  );

  if (!initCheck.Item) {
    const seed = createInitialWorkspace();

    await docClient.send(
      new PutCommand({
        TableName: tableNames.company,
        Item: { id: "promach", ...seed.company },
      }),
    );

    for (const item of seed.clients) {
      await docClient.send(
        new PutCommand({ TableName: tableNames.clients, Item: item }),
      );
    }
    for (const item of seed.locations) {
      await docClient.send(
        new PutCommand({ TableName: tableNames.locations, Item: item }),
      );
    }
    for (const item of seed.equipment) {
      await docClient.send(
        new PutCommand({ TableName: tableNames.equipment, Item: item }),
      );
    }
    for (const item of seed.checklistTemplates) {
      await docClient.send(
        new PutCommand({
          TableName: tableNames["checklist-templates"],
          Item: item,
        }),
      );
    }
    for (const item of seed.technicians) {
      await docClient.send(
        new PutCommand({ TableName: tableNames.technicians, Item: item }),
      );
    }
    for (const item of seed.serviceTypes) {
      await docClient.send(
        new PutCommand({ TableName: tableNames["service-types"], Item: item }),
      );
    }
    for (const item of seed.reports) {
      await docClient.send(
        new PutCommand({ TableName: tableNames.reports, Item: item }),
      );
    }

    await docClient.send(
      new PutCommand({
        TableName: tableNames.state,
        Item: {
          id: "workspace-seed-v1",
          schemaVersion: 1,
          initializedAt: new Date().toISOString(),
        },
      }),
    );
  }

  const username = process.env.ADMIN_USERNAME?.trim() || "promach-admin";
  const password = process.env.ADMIN_PASSWORD;
  if (password) {
    const usersScan = await docClient.send(
      new ScanCommand({
        TableName: tableNames.users,
        FilterExpression: "#u = :u",
        ExpressionAttributeNames: { "#u": "username" },
        ExpressionAttributeValues: { ":u": username },
      }),
    );
    if (!usersScan.Items || usersScan.Items.length === 0) {
      const now = new Date().toISOString();
      await docClient.send(
        new PutCommand({
          TableName: tableNames.users,
          Item: {
            id: `bootstrap-${username}`,
            username,
            email: process.env.ADMIN_EMAIL?.trim() || `${username}@promach.local`,
            passwordHash: hashPassword(password),
            name: process.env.ADMIN_NAME?.trim() || "Promach Admin",
            phone: "",
            designation: "System Administrator",
            role: "Administrator",
            active: true,
            createdAt: now,
            updatedAt: now,
          } satisfies StoredUser,
        }),
      );
    }
  }

  const reportsScan = await docClient.send(
    new ScanCommand({
      TableName: tableNames.reports,
      ProjectionExpression: "id",
    }),
  );
  const highestReportNumber = (reportsScan.Items || []).reduce(
    (maximum, row) =>
      Math.max(maximum, Number.parseInt(String(row.id), 10) || 0),
    4122,
  );

  const counterItem = await docClient.send(
    new GetCommand({
      TableName: tableNames.state,
      Key: { id: "report-number" },
    }),
  );
  if (!counterItem.Item || (counterItem.Item.value || 0) < highestReportNumber) {
    await docClient.send(
      new PutCommand({
        TableName: tableNames.state,
        Item: { id: "report-number", value: highestReportNumber },
      }),
    );
  }
}

export async function readWorkspace(): Promise<WorkspaceSnapshot> {
  await ensureDatabase();
  const docClient = dynamoDocClient();

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
    docClient.send(
      new GetCommand({
        TableName: tableNames.company,
        Key: { id: "promach" },
      }),
    ),
    docClient.send(new ScanCommand({ TableName: tableNames.clients })),
    docClient.send(new ScanCommand({ TableName: tableNames.locations })),
    docClient.send(new ScanCommand({ TableName: tableNames.equipment })),
    docClient.send(
      new ScanCommand({ TableName: tableNames["checklist-templates"] }),
    ),
    docClient.send(new ScanCommand({ TableName: tableNames.technicians })),
    docClient.send(new ScanCommand({ TableName: tableNames["service-types"] })),
    docClient.send(new ScanCommand({ TableName: tableNames.reports })),
  ]);

  if (!companyRes.Item) {
    throw new Error("Company profile is not initialized.");
  }

  const companyDoc = companyRes.Item;
  const company: CompanyProfile = {
    name: companyDoc.name,
    address: companyDoc.address,
    phone: companyDoc.phone,
    email: companyDoc.email,
    website: companyDoc.website,
    registration: companyDoc.registration,
  };

  const byName = <T extends { name: string }>(left: T, right: T) =>
    left.name.localeCompare(right.name);

  return {
    company,
    clients: ((clientsRes.Items || []) as ClientRecord[]).sort(byName),
    locations: ((locationsRes.Items || []) as LocationRecord[]).sort(byName),
    equipment: ((equipmentRes.Items || []) as EquipmentRecord[]).sort(byName),
    checklistTemplates: (
      (templatesRes.Items || []) as ChecklistTemplateRecord[]
    ).sort(byName),
    technicians: ((techsRes.Items || []) as TechnicianRecord[]).sort(byName),
    serviceTypes: ((typesRes.Items || []) as ServiceTypeRecord[]).sort(byName),
    reports: ((reportsRes.Items || []) as StoredReport[])
      .map(cleanReport)
      .sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0)),
  };
}

export async function findMasterRecord(
  entity: MasterEntity,
  id: string,
): Promise<MasterRecord | null> {
  const docClient = dynamoDocClient();
  const res = await docClient.send(
    new GetCommand({
      TableName: tableNames[entity],
      Key: { id },
    }),
  );
  return (res.Item as MasterRecord) || null;
}

export async function insertMasterRecord(
  entity: MasterEntity,
  record: MasterRecord,
): Promise<void> {
  const docClient = dynamoDocClient();
  await docClient.send(
    new PutCommand({
      TableName: tableNames[entity],
      Item: record,
    }),
  );
}

export async function replaceMasterRecord(
  entity: MasterEntity,
  id: string,
  record: MasterRecord,
): Promise<boolean> {
  const docClient = dynamoDocClient();
  await docClient.send(
    new PutCommand({
      TableName: tableNames[entity],
      Item: { ...record, id },
    }),
  );
  return true;
}

export async function removeMasterRecord(
  entity: MasterEntity,
  id: string,
): Promise<boolean> {
  const docClient = dynamoDocClient();
  await docClient.send(
    new DeleteCommand({
      TableName: tableNames[entity],
      Key: { id },
    }),
  );
  return true;
}

export async function serviceTypeNameExists(
  name: string,
  excludedId?: string,
): Promise<boolean> {
  const docClient = dynamoDocClient();
  const res = await docClient.send(
    new ScanCommand({
      TableName: tableNames["service-types"],
    }),
  );
  const lowerName = name.trim().toLowerCase();
  return (res.Items || []).some(
    (item) =>
      item.id !== excludedId &&
      String(item.name || "").trim().toLowerCase() === lowerName,
  );
}

export async function nextReportNumber(): Promise<string> {
  const docClient = dynamoDocClient();
  const res = await docClient.send(
    new UpdateCommand({
      TableName: tableNames.state,
      Key: { id: "report-number" },
      UpdateExpression: "ADD #val :inc",
      ExpressionAttributeNames: { "#val": "value" },
      ExpressionAttributeValues: { ":inc": 1 },
      ReturnValues: "ALL_NEW",
    }),
  );
  const val = res.Attributes?.value;
  if (val === undefined || val === null) {
    throw new Error("Unable to allocate a service report number.");
  }
  return String(val);
}

export async function insertReport(report: WorkspaceReport): Promise<void> {
  const docClient = dynamoDocClient();
  await docClient.send(
    new PutCommand({
      TableName: tableNames.reports,
      Item: report,
    }),
  );
}

export async function findReport(
  reportId: string,
): Promise<WorkspaceReport | null> {
  const docClient = dynamoDocClient();
  const res = await docClient.send(
    new GetCommand({
      TableName: tableNames.reports,
      Key: { id: reportId },
    }),
  );
  if (!res.Item) return null;
  return cleanReport(res.Item as StoredReport);
}

export async function issueReportShareLink(
  reportId: string,
  shareTokenHash: string,
  sentAt: string,
  auditEvent: WorkspaceReport["auditTrail"][number],
): Promise<"updated" | "missing" | "locked"> {
  const docClient = dynamoDocClient();
  const current = await docClient.send(
    new GetCommand({
      TableName: tableNames.reports,
      Key: { id: reportId },
    }),
  );
  if (!current.Item) return "missing";
  const report = current.Item as StoredReport;
  if (
    !["Draft", "Correction required", "Awaiting client signature"].includes(
      report.status,
    )
  ) {
    return "locked";
  }

  const updatedReport: StoredReport = {
    ...report,
    status: "Awaiting client signature",
    shareTokenHash,
    sentAt,
    auditTrail: [...(report.auditTrail || []), auditEvent],
  };

  await docClient.send(
    new PutCommand({
      TableName: tableNames.reports,
      Item: updatedReport,
    }),
  );

  return "updated";
}

export async function findReportByShareHash(
  shareTokenHash: string,
): Promise<WorkspaceReport | null> {
  const docClient = dynamoDocClient();
  try {
    const res = await docClient.send(
      new QueryCommand({
        TableName: tableNames.reports,
        IndexName: "shareTokenHash-index",
        KeyConditionExpression: "shareTokenHash = :token",
        ExpressionAttributeValues: { ":token": shareTokenHash },
      }),
    );
    if (res.Items && res.Items.length > 0) {
      const rep = res.Items[0] as StoredReport;
      if (["Awaiting client signature", "Completed"].includes(rep.status)) {
        return cleanReport(rep);
      }
    }
  } catch {
    // Fallback to Scan if index is updating
  }

  const scanRes = await docClient.send(
    new ScanCommand({
      TableName: tableNames.reports,
      FilterExpression: "shareTokenHash = :token",
      ExpressionAttributeValues: { ":token": shareTokenHash },
    }),
  );
  if (scanRes.Items && scanRes.Items.length > 0) {
    const rep = scanRes.Items[0] as StoredReport;
    if (["Awaiting client signature", "Completed"].includes(rep.status)) {
      return cleanReport(rep);
    }
  }

  return null;
}

export async function completeReportSignature(
  reportId: string,
  signature: NonNullable<WorkspaceReport["signature"]>,
  acknowledgement: WorkspaceReport["acknowledgement"],
  auditEvent: WorkspaceReport["auditTrail"][number],
): Promise<"updated" | "missing" | "invalid-status"> {
  const docClient = dynamoDocClient();
  const current = await docClient.send(
    new GetCommand({
      TableName: tableNames.reports,
      Key: { id: reportId },
    }),
  );
  if (!current.Item) return "missing";
  const report = current.Item as StoredReport;
  if (report.status !== "Awaiting client signature") return "invalid-status";

  const updatedReport: StoredReport = {
    ...report,
    status: "Completed",
    signature,
    acknowledgement,
    auditTrail: [...(report.auditTrail || []), auditEvent],
  };

  await docClient.send(
    new PutCommand({
      TableName: tableNames.reports,
      Item: updatedReport,
    }),
  );

  return "updated";
}

export async function authenticateUser(
  username: string,
  password: string,
): Promise<UserRecord | null> {
  const docClient = dynamoDocClient();
  const lowerUser = username.trim().toLowerCase();
  const scan = await docClient.send(
    new ScanCommand({
      TableName: tableNames.users,
    }),
  );
  const user = (scan.Items || []).find(
    (item) =>
      String(item.username || "").trim().toLowerCase() === lowerUser &&
      Boolean(item.active),
  ) as StoredUser | undefined;

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return null;
  }
  return userFromStored(user);
}

export async function readUsers(): Promise<UserRecord[]> {
  const docClient = dynamoDocClient();
  const res = await docClient.send(
    new ScanCommand({
      TableName: tableNames.users,
    }),
  );
  const users = (res.Items || []) as StoredUser[];
  return users
    .map(userFromStored)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function findUser(userId: string): Promise<UserRecord | null> {
  const docClient = dynamoDocClient();
  const res = await docClient.send(
    new GetCommand({
      TableName: tableNames.users,
      Key: { id: userId },
    }),
  );
  if (!res.Item) return null;
  return userFromStored(res.Item as StoredUser);
}

export async function insertUser(
  record: UserRecord,
  password: string,
): Promise<void> {
  const docClient = dynamoDocClient();
  const stored: StoredUser = {
    ...record,
    passwordHash: hashPassword(password),
  };
  await docClient.send(
    new PutCommand({
      TableName: tableNames.users,
      Item: stored,
    }),
  );
}

export async function replaceUser(
  userId: string,
  record: UserRecord,
  password?: string,
): Promise<boolean> {
  const docClient = dynamoDocClient();
  const current = await docClient.send(
    new GetCommand({
      TableName: tableNames.users,
      Key: { id: userId },
    }),
  );
  if (!current.Item) return false;
  const currentStored = current.Item as StoredUser;

  const stored: StoredUser = {
    ...record,
    id: userId,
    passwordHash: password
      ? hashPassword(password)
      : currentStored.passwordHash,
  };

  await docClient.send(
    new PutCommand({
      TableName: tableNames.users,
      Item: stored,
    }),
  );
  return true;
}

export async function updateUserProfile(
  userId: string,
  values: Pick<UserRecord, "name" | "email" | "phone" | "designation">,
  password?: string,
): Promise<UserRecord | null> {
  const docClient = dynamoDocClient();
  const current = await docClient.send(
    new GetCommand({
      TableName: tableNames.users,
      Key: { id: userId },
    }),
  );
  if (!current.Item || !current.Item.active) return null;
  const user = current.Item as StoredUser;

  const updated: StoredUser = {
    ...user,
    ...values,
    updatedAt: new Date().toISOString(),
    passwordHash: password ? hashPassword(password) : user.passwordHash,
  };

  await docClient.send(
    new PutCommand({
      TableName: tableNames.users,
      Item: updated,
    }),
  );

  return userFromStored(updated);
}

export async function removeUser(userId: string): Promise<boolean> {
  const docClient = dynamoDocClient();
  await docClient.send(
    new DeleteCommand({
      TableName: tableNames.users,
      Key: { id: userId },
    }),
  );
  return true;
}

export async function userLoginExists(
  username: string,
  email: string,
  excludedId?: string,
): Promise<"username" | "email" | null> {
  const docClient = dynamoDocClient();
  const scan = await docClient.send(
    new ScanCommand({
      TableName: tableNames.users,
    }),
  );
  const lowerUser = username.trim().toLowerCase();
  const lowerEmail = email.trim().toLowerCase();

  for (const item of scan.Items || []) {
    if (item.id === excludedId) continue;
    if (String(item.username || "").trim().toLowerCase() === lowerUser) {
      return "username";
    }
    if (String(item.email || "").trim().toLowerCase() === lowerEmail) {
      return "email";
    }
  }

  return null;
}
