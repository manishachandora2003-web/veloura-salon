import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, PoolConfig } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
  var _drizzleDb: ReturnType<typeof drizzle> | undefined;
}

export const createPool = (): Pool => {
  if (global._postgresPool) {
    return global._postgresPool;
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const connectionString =
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_PRISMA_URL;

  let poolConfig: PoolConfig;

  if (connectionString) {
    const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
    if (isProduction && isLocal) {
      throw new Error(
        'Production database cannot connect to localhost or 127.0.0.1. A valid production PostgreSQL connection string (POSTGRES_URL or DATABASE_URL) is required.'
      );
    }
    poolConfig = {
      connectionString,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: 10,
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 30000,
    };
  } else {
    const host = process.env.POSTGRES_HOST || process.env.SQL_HOST || process.env.PGHOST;
    if (isProduction && !host) {
      throw new Error(
        'Valid production PostgreSQL configuration (POSTGRES_URL, DATABASE_URL, or POSTGRES_HOST) is required.'
      );
    }

    const isUnixSocket = host?.startsWith('/');
    const isLocal = !isUnixSocket && (!host || host.includes('localhost') || host.includes('127.0.0.1'));

    if (isProduction && isLocal) {
      throw new Error(
        'Production database cannot connect to localhost or 127.0.0.1. A valid remote PostgreSQL host or connection string is required.'
      );
    }

    poolConfig = {
      host: host || 'localhost',
      port: process.env.POSTGRES_PORT
        ? parseInt(process.env.POSTGRES_PORT, 10)
        : process.env.SQL_PORT
        ? parseInt(process.env.SQL_PORT, 10)
        : process.env.PGPORT
        ? parseInt(process.env.PGPORT, 10)
        : 5432,
      user: process.env.POSTGRES_USER || process.env.SQL_USER || process.env.PGUSER,
      password: process.env.POSTGRES_PASSWORD || process.env.SQL_PASSWORD || process.env.PGPASSWORD,
      database: process.env.POSTGRES_DATABASE || process.env.SQL_DB_NAME || process.env.PGDATABASE,
      ssl: isUnixSocket || isLocal ? false : { rejectUnauthorized: false },
      max: 10,
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 30000,
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

