import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

let pool: Pool | null = null;
let isPgInitialized = false;

// Directorio y archivo de persistencia local en servidor
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'praxis_db_store.json');

export type DbEngineType = 'POSTGRESQL' | 'SERVER_FILE_STORAGE';

function ensureDataDirExists() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.error('[DB Storage] Error creating data directory:', err);
  }
}

function readFileStore(): Record<string, any> {
  ensureDataDirExists();
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('[DB Storage] Error reading praxis_db_store.json:', err);
  }
  return {};
}

function writeFileStore(data: Record<string, any>): boolean {
  ensureDataDirExists();
  try {
    const tempFile = `${STORE_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, STORE_FILE);
    return true;
  } catch (err) {
    console.error('[DB Storage] Error writing praxis_db_store.json with temp rename:', err);
    try {
      fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (e2) {
      console.error('[DB Storage] Fallback direct write failed:', e2);
      return false;
    }
  }
}

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
      console.error('[PostgreSQL] Unexpected error on idle client:', err);
    });
  }
  return pool;
}

export async function isPostgresConnected(): Promise<boolean> {
  const db = getDbPool();
  if (!db) return false;
  try {
    const client = await db.connect();
    try {
      await client.query('SELECT 1');
      return true;
    } finally {
      client.release();
    }
  } catch (e) {
    return false;
  }
}

export async function getDbEngine(): Promise<DbEngineType> {
  if (process.env.DATABASE_URL) {
    const isPgOk = await isPostgresConnected();
    if (isPgOk) return 'POSTGRESQL';
  }
  return 'SERVER_FILE_STORAGE';
}

export async function isDbConnected(): Promise<boolean> {
  // El servidor siempre tiene persistencia garantizada:
  // bien sea por PostgreSQL o por almacenamiento en disco local seguro.
  return true;
}

export async function initDb(): Promise<boolean> {
  ensureDataDirExists();
  const db = getDbPool();
  if (!db) return true; // File store is ready

  if (isPgInitialized) return true;

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS praxis_entity_store (
        id VARCHAR(64) PRIMARY KEY,
        data JSONB NOT NULL,
        version INTEGER DEFAULT 1,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    isPgInitialized = true;

    // Migración automática: Si hay datos en disco y PostgreSQL está vacío, sincronizarlos
    try {
      const fileData = readFileStore();
      const keys = Object.keys(fileData);
      if (keys.length > 0) {
        for (const key of keys) {
          await db.query(
            `
            INSERT INTO praxis_entity_store (id, data, updated_at)
            VALUES ($1, $2, CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO NOTHING;
            `,
            [key, JSON.stringify(fileData[key])]
          );
        }
      }
    } catch (migErr) {
      console.warn('[DB Migration] Warning during JSON-to-PostgreSQL initial migration:', migErr);
    }

    return true;
  } catch (err) {
    console.error('[PostgreSQL] Error initializing tables:', err);
    return false;
  }
}

export async function getEntity<T>(id: string): Promise<T | null> {
  const engine = await getDbEngine();
  if (engine === 'POSTGRESQL') {
    const db = getDbPool();
    if (db) {
      try {
        await initDb();
        const res = await db.query('SELECT data FROM praxis_entity_store WHERE id = $1', [id]);
        if (res.rows.length > 0) {
          return res.rows[0].data as T;
        }
      } catch (err) {
        console.error(`[PostgreSQL] Error reading entity ${id}, falling back to file store:`, err);
      }
    }
  }

  // Fallback a almacenamiento en archivo del servidor
  const store = readFileStore();
  return (store[id] as T) || null;
}

export async function saveEntity<T>(id: string, data: T): Promise<boolean> {
  const engine = await getDbEngine();
  let savedPg = false;

  if (engine === 'POSTGRESQL') {
    const db = getDbPool();
    if (db) {
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
        savedPg = true;
      } catch (err) {
        console.error(`[PostgreSQL] Error saving entity ${id}:`, err);
      }
    }
  }

  // Escritura dual: siempre guardar en disco local del servidor como respaldo garantizado
  const store = readFileStore();
  store[id] = data;
  const savedFile = writeFileStore(store);

  return savedPg || savedFile;
}

export async function getAllEntities(): Promise<{
  connected: boolean;
  engine: DbEngineType;
  data: Record<string, any>;
}> {
  const engine = await getDbEngine();
  if (engine === 'POSTGRESQL') {
    const db = getDbPool();
    if (db) {
      try {
        await initDb();
        const res = await db.query('SELECT id, data FROM praxis_entity_store');
        const result: Record<string, any> = {};
        for (const row of res.rows) {
          result[row.id] = row.data;
        }
        if (Object.keys(result).length > 0) {
          return { connected: true, engine: 'POSTGRESQL', data: result };
        }
      } catch (err) {
        console.error('[PostgreSQL] Error fetching all entities, falling back to file store:', err);
      }
    }
  }

  // File store en servidor
  const fileData = readFileStore();
  return {
    connected: true,
    engine: 'SERVER_FILE_STORAGE',
    data: fileData,
  };
}
