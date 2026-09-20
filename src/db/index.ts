import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, PoolConfig } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    const connectionString =
      process.env.POSTGRES_URL ||
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL_NON_POOLING ||
      process.env.POSTGRES_PRISMA_URL;

    let poolConfig: PoolConfig;

    if (connectionString) {
      const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
      poolConfig = {
        connectionString,
        ssl: isLocal ? false : { rejectUnauthorized: false },
        max: 10,
        connectionTimeoutMillis: 15000,
      };
    } else {
      const host = process.env.POSTGRES_HOST || process.env.SQL_HOST;
      const isUnixSocket = host?.startsWith('/');
      const isLocal = !host || host.includes('localhost') || host.includes('127.0.0.1');

      poolConfig = {
        host,
        port: process.env.POSTGRES_PORT
          ? parseInt(process.env.POSTGRES_PORT, 10)
          : process.env.SQL_PORT
          ? parseInt(process.env.SQL_PORT, 10)
          : 5432,
        user: process.env.POSTGRES_USER || process.env.SQL_USER,
        password: process.env.POSTGRES_PASSWORD || process.env.SQL_PASSWORD,
        database: process.env.POSTGRES_DATABASE || process.env.SQL_DB_NAME,
        ssl: isUnixSocket || isLocal ? false : { rejectUnauthorized: false },
        max: 10,
        connectionTimeoutMillis: 15000,
      };
    }

    global._postgresPool = new Pool(poolConfig);

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

const pool = createPool();
export const db = drizzle(pool, { schema });
