import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import pg from "pg";

const { Pool } = pg;

declare global {
  var __promachPostgresPoolPromise: Promise<pg.Pool> | undefined;
  var __promachPostgresSecretCache:
    | { password?: string; user?: string }
    | undefined;
}

const DEFAULT_REGION = "ap-southeast-1";

function region(): string {
  return process.env.AWS_REGION?.trim() || DEFAULT_REGION;
}

async function resolveCredentials(): Promise<{ user: string; password?: string }> {
  let user = process.env.DATABASE_USER?.trim() || "promach_admin";
  let password = process.env.DATABASE_PASSWORD?.trim();

  if (password) {
    return { user, password };
  }

  if (globalThis.__promachPostgresSecretCache?.password) {
    return {
      user: globalThis.__promachPostgresSecretCache.user || user,
      password: globalThis.__promachPostgresSecretCache.password,
    };
  }

  const secretArn = process.env.RDS_SECRET_ARN?.trim();
  if (secretArn) {
    try {
      const accessKeyId =
        process.env.AWS_ACCESS_KEY_ID?.trim() ||
        process.env.AWS_ROOT_ACCESS_KEY?.trim();
      const secretAccessKey =
        process.env.AWS_SECRET_ACCESS_KEY?.trim() ||
        process.env.AWS_ROOT_SECRET_ACCESS_KEY?.trim();

      const smClient = new SecretsManagerClient({
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

      const response = await smClient.send(
        new GetSecretValueCommand({ SecretId: secretArn }),
      );
      if (response.SecretString) {
        const secret = JSON.parse(response.SecretString);
        if (secret.password) {
          password = String(secret.password);
        }
        if (secret.username) {
          user = String(secret.username);
        }
        globalThis.__promachPostgresSecretCache = { password, user };
      }
    } catch (error) {
      console.warn("Failed to fetch RDS secret from Secrets Manager:", error);
    }
  }

  return { user, password };
}

async function createPool(): Promise<pg.Pool> {
  const host = process.env.DATABASE_HOST?.trim() || "localhost";
  const port = Number.parseInt(process.env.DATABASE_PORT?.trim() || "5432", 10);
  const database = process.env.DATABASE_NAME?.trim() || "report_gen";
  const { user, password } = await resolveCredentials();

  const sslMode = process.env.DATABASE_SSL_MODE?.trim() || "require";
  const isSslDisabled = sslMode === "disable" || host === "localhost" || host === "127.0.0.1";

  const pool = new Pool({
    host,
    port,
    database,
    user,
    password,
    ssl: isSslDisabled
      ? false
      : {
          rejectUnauthorized: false,
        },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  pool.on("error", (err) => {
    console.error("Unexpected error on idle PostgreSQL client:", err);
  });

  return pool;
}

export async function postgresPool(): Promise<pg.Pool> {
  if (!globalThis.__promachPostgresPoolPromise) {
    const connectionPromise = createPool();
    globalThis.__promachPostgresPoolPromise = connectionPromise;
    connectionPromise.catch(() => {
      if (globalThis.__promachPostgresPoolPromise === connectionPromise) {
        globalThis.__promachPostgresPoolPromise = undefined;
      }
    });
  }
  return globalThis.__promachPostgresPoolPromise;
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sqlText: string,
  params: unknown[] = [],
): Promise<pg.QueryResult<T>> {
  const pool = await postgresPool();
  return pool.query<T>(sqlText, params);
}

export async function pingPostgresDatabase(): Promise<void> {
  const pool = await postgresPool();
  const client = await pool.connect();
  try {
    await client.query("SELECT 1;");
  } finally {
    client.release();
  }
}

export async function closePostgresConnection(): Promise<void> {
  const poolPromise = globalThis.__promachPostgresPoolPromise;
  globalThis.__promachPostgresPoolPromise = undefined;
  if (poolPromise) {
    const pool = await poolPromise;
    await pool.end();
  }
}
