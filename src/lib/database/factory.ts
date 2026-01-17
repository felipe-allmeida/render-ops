/**
 * Database Adapter Factory
 *
 * Creates the appropriate database adapter based on connection configuration.
 */

import { DatabaseAdapter, DatabaseType, AdapterConfig } from './types';
import { createPostgreSQLAdapter } from './adapters/postgresql';
import { createMySQLAdapter } from './adapters/mysql';
import { createMongoDBAdapter } from './adapters/mongodb';
import { createSQLServerAdapter } from './adapters/sqlserver';

// Adapter cache to reuse connections
const adapterCache = new Map<string, DatabaseAdapter>();

/**
 * Parse a connection string to determine the database type
 */
export function parseConnectionString(connectionString: string): {
  type: DatabaseType;
  normalized: string;
} {
  const lowerConn = connectionString.toLowerCase();

  if (lowerConn.startsWith('postgresql://') || lowerConn.startsWith('postgres://')) {
    return { type: 'postgresql', normalized: connectionString };
  }

  if (lowerConn.startsWith('mysql://') || lowerConn.startsWith('mariadb://')) {
    return { type: 'mysql', normalized: connectionString };
  }

  if (lowerConn.startsWith('mongodb://') || lowerConn.startsWith('mongodb+srv://')) {
    return { type: 'mongodb', normalized: connectionString };
  }

  if (
    lowerConn.startsWith('mssql://') ||
    lowerConn.startsWith('sqlserver://') ||
    lowerConn.includes('server=') ||
    lowerConn.includes('data source=')
  ) {
    return { type: 'sqlserver', normalized: connectionString };
  }

  // Default to PostgreSQL for backwards compatibility
  return { type: 'postgresql', normalized: connectionString };
}

/**
 * Create a database adapter based on the connection string
 */
export function createAdapter(connectionString: string): DatabaseAdapter {
  const { type, normalized } = parseConnectionString(connectionString);

  const config: AdapterConfig = {
    connectionString: normalized,
    poolSize: 5,
    idleTimeout: 30000,
    connectionTimeout: 10000,
  };

  switch (type) {
    case 'postgresql':
      return createPostgreSQLAdapter(config);

    case 'mysql':
      return createMySQLAdapter(config);

    case 'mongodb':
      return createMongoDBAdapter(config);

    case 'sqlserver':
      return createSQLServerAdapter(config);

    default:
      throw new Error(`Unsupported database type: ${type}`);
  }
}

/**
 * Get or create a cached adapter for a connection string
 *
 * This is useful for reusing connections across requests.
 */
export function getAdapter(connectionString: string): DatabaseAdapter {
  let adapter = adapterCache.get(connectionString);

  if (!adapter) {
    adapter = createAdapter(connectionString);
    adapterCache.set(connectionString, adapter);
  }

  return adapter;
}

/**
 * Close and remove a cached adapter
 */
export async function closeAdapter(connectionString: string): Promise<void> {
  const adapter = adapterCache.get(connectionString);

  if (adapter) {
    await adapter.disconnect();
    adapterCache.delete(connectionString);
  }
}

/**
 * Close all cached adapters
 */
export async function closeAllAdapters(): Promise<void> {
  const closePromises = Array.from(adapterCache.values()).map((adapter) =>
    adapter.disconnect()
  );
  await Promise.all(closePromises);
  adapterCache.clear();
}

/**
 * Get the database type from a connection string
 */
export function getDatabaseType(connectionString: string): DatabaseType {
  return parseConnectionString(connectionString).type;
}

/**
 * Check if a database type is supported
 */
export function isSupportedDatabaseType(type: string): type is DatabaseType {
  return ['postgresql', 'mysql', 'mongodb', 'sqlserver'].includes(type);
}

/**
 * Get a list of supported database types
 */
export function getSupportedDatabaseTypes(): DatabaseType[] {
  return ['postgresql', 'mysql', 'mongodb', 'sqlserver'];
}

/**
 * Get display information for database types
 */
export function getDatabaseTypeInfo(type: DatabaseType): {
  name: string;
  description: string;
  defaultPort: number;
  connectionStringExample: string;
  isImplemented: boolean;
} {
  const info: Record<DatabaseType, ReturnType<typeof getDatabaseTypeInfo>> = {
    postgresql: {
      name: 'PostgreSQL',
      description: 'Advanced open-source relational database',
      defaultPort: 5432,
      connectionStringExample: 'postgresql://user:password@host:5432/database',
      isImplemented: true,
    },
    mysql: {
      name: 'MySQL',
      description: 'Popular open-source relational database',
      defaultPort: 3306,
      connectionStringExample: 'mysql://user:password@host:3306/database',
      isImplemented: true,
    },
    mongodb: {
      name: 'MongoDB',
      description: 'NoSQL document database',
      defaultPort: 27017,
      connectionStringExample: 'mongodb://user:password@host:27017/database',
      isImplemented: true,
    },
    sqlserver: {
      name: 'SQL Server',
      description: 'Microsoft enterprise relational database',
      defaultPort: 1433,
      connectionStringExample: 'mssql://user:password@host:1433/database',
      isImplemented: true,
    },
  };

  return info[type];
}
