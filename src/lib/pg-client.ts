import { Pool, PoolClient } from 'pg';

// Cache for connection pools (per connection string)
const pools = new Map<string, Pool>();

/**
 * Get or create a connection pool for a given connection string
 */
export function getPool(connectionString: string): Pool {
  let pool = pools.get(connectionString);
  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    pools.set(connectionString, pool);
  }
  return pool;
}

/**
 * Execute a query with a connection from the pool
 */
export async function query<T = Record<string, unknown>>(
  connectionString: string,
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const pool = getPool(connectionString);
  const result = await pool.query(sql, params);
  return result.rows as T[];
}

/**
 * Get a client from the pool for transactions
 */
export async function getClient(connectionString: string): Promise<PoolClient> {
  const pool = getPool(connectionString);
  return pool.connect();
}

/**
 * Close a specific pool
 */
export async function closePool(connectionString: string): Promise<void> {
  const pool = pools.get(connectionString);
  if (pool) {
    await pool.end();
    pools.delete(connectionString);
  }
}

/**
 * Close all pools
 */
export async function closeAllPools(): Promise<void> {
  for (const pool of pools.values()) {
    await pool.end();
  }
  pools.clear();
}

// PostgreSQL type mapping
export const PG_TYPE_MAP: Record<string, string> = {
  // Numeric types
  int2: 'number',
  int4: 'number',
  int8: 'number',
  smallint: 'number',
  integer: 'number',
  bigint: 'number',
  decimal: 'number',
  numeric: 'number',
  real: 'number',
  float4: 'number',
  float8: 'number',
  'double precision': 'number',
  money: 'currency',

  // String types
  char: 'text',
  varchar: 'text',
  'character varying': 'text',
  text: 'text',
  name: 'text',
  uuid: 'text',

  // Boolean
  bool: 'boolean',
  boolean: 'boolean',

  // Date/Time
  date: 'date',
  time: 'time',
  timetz: 'time',
  timestamp: 'datetime',
  timestamptz: 'datetime',

  // JSON
  json: 'json',
  jsonb: 'json',

  // Other
  bytea: 'binary',
  inet: 'text',
  cidr: 'text',
  macaddr: 'text',
};

/**
 * Map PostgreSQL type to field type for UI generation
 */
export function mapPgTypeToFieldType(
  pgType: string
): 'text' | 'number' | 'boolean' | 'date' | 'datetime' | 'currency' | 'json' {
  const normalizedType = pgType.toLowerCase();

  // Check for array types
  if (normalizedType.endsWith('[]')) {
    return 'json';
  }

  const mappedType = PG_TYPE_MAP[normalizedType];
  if (mappedType === 'number') return 'number';
  if (mappedType === 'boolean') return 'boolean';
  if (mappedType === 'date') return 'date';
  if (mappedType === 'datetime') return 'datetime';
  if (mappedType === 'currency') return 'currency';
  if (mappedType === 'json') return 'json';

  return 'text';
}
