import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const DEFAULT_REGION = "ap-southeast-1";

declare global {
  var __promachDynamoDocClient: DynamoDBDocumentClient | undefined;
  var __promachDynamoClient: DynamoDBClient | undefined;
}

function region(): string {
  return process.env.AWS_REGION?.trim() || DEFAULT_REGION;
}

export function dynamoClient(): DynamoDBClient {
  if (!globalThis.__promachDynamoClient) {
    const accessKeyId =
      process.env.AWS_ACCESS_KEY_ID?.trim() ||
      process.env.AWS_ROOT_ACCESS_KEY?.trim();
    const secretAccessKey =
      process.env.AWS_SECRET_ACCESS_KEY?.trim() ||
      process.env.AWS_ROOT_SECRET_ACCESS_KEY?.trim();

    globalThis.__promachDynamoClient = new DynamoDBClient({
      region: region(),
      ...(accessKeyId && secretAccessKey
        ? {
            credentials: {
              accessKeyId,
              secretAccessKey,
              sessionToken: process.env.AWS_SESSION_TOKEN?.trim() || undefined,
            },
          }
        : {}),
    });
  }
  return globalThis.__promachDynamoClient;
}

export function dynamoDocClient(): DynamoDBDocumentClient {
  if (!globalThis.__promachDynamoDocClient) {
    const client = dynamoClient();
    globalThis.__promachDynamoDocClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: {
        removeUndefinedValues: true,
        convertEmptyValues: true,
      },
    });
  }
  return globalThis.__promachDynamoDocClient;
}

export const tablePrefix = process.env.DYNAMODB_TABLE_PREFIX?.trim() || "promach_dsr_";

export const tableNames = {
  company: `${tablePrefix}company_profiles`,
  clients: `${tablePrefix}clients`,
  locations: `${tablePrefix}locations`,
  equipment: `${tablePrefix}equipment`,
  "checklist-templates": `${tablePrefix}checklist_templates`,
  technicians: `${tablePrefix}technicians`,
  "service-types": `${tablePrefix}service_types`,
  reports: `${tablePrefix}service_reports`,
  users: `${tablePrefix}users`,
  state: `${tablePrefix}system_state`,
} as const;
