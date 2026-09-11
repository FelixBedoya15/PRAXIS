import { Pool } from 'pg';

let pool: Pool | null = null;
let isInitialized = false;

export function getDbPool(): Pool | null {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return null;
  }
  if (!pool) {
    const isLocalOrInternal =
      connectionString.includes('localhost') ||
      connectionString.includes('127.0.0.1') ||
      connectionString.includes('postgres:') ||
      connectionString.includes('dokploy');

    pool = new Pool({
      connectionString,
      ssl: isLocalOrInternal ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
    });
  }
  return pool;
}

export async function initDb(): Promise<boolean> {
  const db = getDbPool();
  if (!db) return false;
  if (isInitialized) return true;

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS praxis_entity_store (
        id VARCHAR(64) PRIMARY KEY,
        data JSONB NOT NULL,
        version INTEGER DEFAULT 1,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    isInitialized = true;
    return true;
  } catch (err) {
    console.error('Error initializing PostgreSQL tables:', err);
    return false;
  }
}

export async function isDbConnected(): Promise<boolean> {
  const db = getDbPool();
  if (!db) return false;
  try {
    await db.query('SELECT 1');
    return true;
  } catch (e) {
    return false;
  }
}

export async function getEntity<T>(id: string): Promise<T | null> {
  const db = getDbPool();
  if (!db) return null;

  try {
    await initDb();
    const res = await db.query('SELECT data FROM praxis_entity_store WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return res.rows[0].data as T;
  } catch (err) {
    console.error(`Error reading entity ${id} from PostgreSQL:`, err);
    return null;
  }
}

export async function saveEntity<T>(id: string, data: T): Promise<boolean> {
  const db = getDbPool();
  if (!db) return false;

  try {
    await initDb();
    await db.query(
      `
      INSERT INTO praxis_entity_store (id, data, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE
      SET data = EXCLUDED.data,
          updated_at = CURRENT_TIMESTAMP,
          version = praxis_entity_store.version + 1;
    `,
      [id, JSON.stringify(data)]
    );
    return true;
  } catch (err) {
    console.error(`Error saving entity ${id} to PostgreSQL:`, err);
    return false;
  }
}

export async function getAllEntities(): Promise<{
  connected: boolean;
  data: Record<string, any>;
}> {
  const db = getDbPool();
  if (!db) {
    return { connected: false, data: {} };
  }

  try {
    await initDb();
    const res = await db.query('SELECT id, data FROM praxis_entity_store');
    const result: Record<string, any> = {};
    for (const row of res.rows) {
      result[row.id] = row.data;
    }
    return { connected: true, data: result };
  } catch (err) {
    console.error('Error fetching all entities from PostgreSQL:', err);
    return { connected: false, data: {} };
  }
}
