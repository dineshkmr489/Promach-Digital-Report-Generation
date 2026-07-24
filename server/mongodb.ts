import { MongoClient, ServerApiVersion, type Db } from "mongodb";

declare global {
  var __promachMongoClientPromise: Promise<MongoClient> | undefined;
}

function connectionUri(): string {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not configured. Add it to .env.local or the EC2 environment file.",
    );
  }
  return uri;
}

function clientPromise(): Promise<MongoClient> {
  if (!globalThis.__promachMongoClientPromise) {
    const client = new MongoClient(connectionUri(), {
      maxPoolSize: 20,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 10_000,
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
    globalThis.__promachMongoClientPromise = client.connect();
  }
  return globalThis.__promachMongoClientPromise;
}

export async function mongoDatabase(): Promise<Db> {
  const client = await clientPromise();
  return client.db(process.env.MONGODB_DB?.trim() || "report_gen");
}

export async function pingMongoDatabase(): Promise<void> {
  const db = await mongoDatabase();
  await db.command({ ping: 1 });
}

export async function closeMongoConnection(): Promise<void> {
  const connection = globalThis.__promachMongoClientPromise;
  globalThis.__promachMongoClientPromise = undefined;
  if (connection) {
    await (await connection).close();
  }
}
