import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, PoolConfig } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
  var _drizzleDb: ReturnType<typeof drizzle> | undefined;
}

/**
 * Strips matching surrounding single or double quotes
 */
function unquote(val: string): string {
  const trimmed = val.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

/**
 * Safely reads an environment variable at runtime from process.env:
 * 1. Checks exact key name
 * 2. Checks trimmed key name
 * 3. Checks case-insensitive key name
 * Strips surrounding quotes and whitespace.
 */
export function getCleanEnvVar(...names: string[]): string | undefined {
  if (typeof process === 'undefined' || !process.env) {
    return undefined;
  }

  for (const name of names) {
    // Exact match
    const direct = process.env[name];
    if (typeof direct === 'string' && direct.trim().length > 0) {
      return unquote(direct);
    }

    // Trimmed / case-insensitive search across all process.env keys
    const targetLower = name.trim().toLowerCase();
    for (const [key, val] of Object.entries(process.env)) {
      if (key.trim().toLowerCase() === targetLower && typeof val === 'string' && val.trim().length > 0) {
        return unquote(val);
      }
    }
  }

  return undefined;
}

export interface DatabaseDiagnostic {
  databaseUrlExists: boolean;
  otherSupportedPostgresVarsExist: boolean;
  supportedVarsFound: string[];
  selectedHostIsLocalhost: boolean;
  connectionConfigSyntacticallyUsable: boolean;
  connectionMode: 'connectionString' | 'individualParams' | 'none';
  nodeEnv: string;
  vercelEnv: string;
  matchingEnvKeys: string[];
}

/**
 * Safe server-side diagnostic reporting ONLY metadata about configuration presence
 * and syntactic validity. NEVER exposes any URL, password, username, hostname, or secret.
 */
export function getDatabaseDiagnostic(): DatabaseDiagnostic {
  const dbUrl = getCleanEnvVar('DATABASE_URL');
  const databaseUrlExists = !!dbUrl;

  const supportedVarsToCheck = [
    'DATABASE_URL',
    'POSTGRES_URL',
    'POSTGRES_URL_NON_POOLING',
    'POSTGRES_PRISMA_URL',
    'SUPABASE_DATABASE_URL',
    'SUPABASE_DB_URL',
    'POSTGRES_HOST',
    'PGHOST',
    'SQL_HOST',
    'POSTGRES_PORT',
    'PGPORT',
    'SQL_PORT',
    'POSTGRES_USER',
    'PGUSER',
    'SQL_USER',
    'POSTGRES_PASSWORD',
    'PGPASSWORD',
    'SQL_PASSWORD',
    'POSTGRES_DATABASE',
    'PGDATABASE',
    'SQL_DB_NAME',
  ];

  const supportedVarsFound: string[] = [];
  for (const varName of supportedVarsToCheck) {
    if (getCleanEnvVar(varName)) {
      supportedVarsFound.push(varName);
    }
  }

  const otherSupportedPostgresVarsExist = supportedVarsFound.some(
    (name) => name !== 'DATABASE_URL'
  );

  const matchingEnvKeys = Object.keys(process.env || {}).filter((k) =>
    /^(DATABASE|POSTGRES|PG|SQL|SUPABASE)/i.test(k.trim())
  );

  const connStr =
    getCleanEnvVar('DATABASE_URL') ||
    getCleanEnvVar('POSTGRES_URL') ||
    getCleanEnvVar('POSTGRES_URL_NON_POOLING') ||
    getCleanEnvVar('POSTGRES_PRISMA_URL') ||
    getCleanEnvVar('SUPABASE_DATABASE_URL') ||
    getCleanEnvVar('SUPABASE_DB_URL');

  const host =
    getCleanEnvVar('POSTGRES_HOST') ||
    getCleanEnvVar('PGHOST') ||
    getCleanEnvVar('SQL_HOST');

  let connectionMode: 'connectionString' | 'individualParams' | 'none' = 'none';
  let connectionConfigSyntacticallyUsable = false;
  let selectedHostIsLocalhost = false;

  if (connStr) {
    connectionMode = 'connectionString';
    try {
      const parsed = new URL(connStr);
      connectionConfigSyntacticallyUsable = !!parsed.protocol && !!parsed.host;
      selectedHostIsLocalhost =
        parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    } catch {
      connectionConfigSyntacticallyUsable = /^postgres(ql)?:\/\//i.test(connStr);
      selectedHostIsLocalhost =
        connStr.includes('localhost') || connStr.includes('127.0.0.1');
    }
  } else if (host) {
    connectionMode = 'individualParams';
    connectionConfigSyntacticallyUsable = true;
    selectedHostIsLocalhost =
      !host.startsWith('/') &&
      (host.includes('localhost') || host.includes('127.0.0.1'));
  }

  return {
    databaseUrlExists,
    otherSupportedPostgresVarsExist,
    supportedVarsFound,
    selectedHostIsLocalhost,
    connectionConfigSyntacticallyUsable,
    connectionMode,
    nodeEnv: process.env.NODE_ENV || 'undefined',
    vercelEnv: process.env.VERCEL_ENV || 'undefined',
    matchingEnvKeys,
  };
}

export const createPool = (): Pool => {
  if (global._postgresPool) {
    return global._postgresPool;
  }

  const isProduction =
    process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';

  // Support all existing variable names; use DATABASE_URL first when it exists
  const connectionString =
    getCleanEnvVar('DATABASE_URL') ||
    getCleanEnvVar('POSTGRES_URL') ||
    getCleanEnvVar('POSTGRES_URL_NON_POOLING') ||
    getCleanEnvVar('POSTGRES_PRISMA_URL') ||
    getCleanEnvVar('SUPABASE_DATABASE_URL') ||
    getCleanEnvVar('SUPABASE_DB_URL');

  let poolConfig: PoolConfig;

  if (connectionString) {
    let isLocal = false;
    try {
      const parsed = new URL(connectionString);
      isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    } catch {
      isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
    }

    if (isProduction && isLocal) {
      throw new Error(
        'Production database cannot connect to localhost or 127.0.0.1. A valid production PostgreSQL connection string (POSTGRES_URL or DATABASE_URL) is required.'
      );
    }

    // Configured for Supabase Transaction Pooler (PgBouncer) and Vercel serverless:
    // 1. Application-side pool kept small (max 2) to prevent connection starvation
    // 2. SSL required for remote Supabase pooler
    // 3. Fast idle timeouts so serverless instances don't hoard connections
    poolConfig = {
      connectionString,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: isProduction ? 2 : 10,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 10000,
    };
  } else {
    const host =
      getCleanEnvVar('POSTGRES_HOST') ||
      getCleanEnvVar('PGHOST') ||
      getCleanEnvVar('SQL_HOST');

    if (isProduction && !host) {
      throw new Error(
        'Valid production PostgreSQL configuration (POSTGRES_URL, DATABASE_URL, or POSTGRES_HOST) is required.'
      );
    }

    const isUnixSocket = host?.startsWith('/');
    const isLocal =
      !isUnixSocket && (!host || host.includes('localhost') || host.includes('127.0.0.1'));

    if (isProduction && isLocal) {
      throw new Error(
        'Production database cannot connect to localhost or 127.0.0.1. A valid remote PostgreSQL host or connection string is required.'
      );
    }

    const portStr =
      getCleanEnvVar('POSTGRES_PORT') ||
      getCleanEnvVar('PGPORT') ||
      getCleanEnvVar('SQL_PORT');

    poolConfig = {
      host: host || 'localhost',
      port: portStr ? parseInt(portStr, 10) : 5432,
      user:
        getCleanEnvVar('POSTGRES_USER') ||
        getCleanEnvVar('PGUSER') ||
        getCleanEnvVar('SQL_USER'),
      password:
        getCleanEnvVar('POSTGRES_PASSWORD') ||
        getCleanEnvVar('PGPASSWORD') ||
        getCleanEnvVar('SQL_PASSWORD'),
      database:
        getCleanEnvVar('POSTGRES_DATABASE') ||
        getCleanEnvVar('PGDATABASE') ||
        getCleanEnvVar('SQL_DB_NAME'),
      ssl: isUnixSocket || isLocal ? false : { rejectUnauthorized: false },
      max: isProduction ? 2 : 10,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 10000,
    };
  }

  const pool = new Pool(poolConfig);

  pool.on('error', (err) => {
    console.error('Unexpected error on idle SQL pool client:', err);
  });

  global._postgresPool = pool;
  return pool;
};

export const getDb = () => {
  if (!global._drizzleDb) {
    const pool = createPool();
    global._drizzleDb = drizzle(pool, { schema });
  }
  return global._drizzleDb;
};

// Export db as a lazy Proxy so importing this module never crashes at load time
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop, receiver) {
    const instance = getDb();
    const val = Reflect.get(instance, prop, receiver);
    if (typeof val === 'function') {
      return val.bind(instance);
    }
    return val;
  },
});


