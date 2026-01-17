/**
 * Database Abstraction Layer
 *
 * Provides a unified interface for working with multiple database types.
 *
 * @example
 * ```typescript
 * import { getAdapter, getDatabaseType } from '@/lib/database';
 *
 * const adapter = getAdapter('postgresql://user:pass@localhost/db');
 * const tables = await adapter.listTables();
 * const schema = await adapter.getTableSchema('users');
 * const users = await adapter.list('users', { page: 1, limit: 20 });
 * ```
 */

// Types
export type {
  DatabaseType,
  FieldType,
  ColumnSchema,
  TableSchema,
  TableInfo,
  ListOptions,
  SearchOptions,
  QueryResult,
  PaginatedResult,
  ConnectionTestResult,
  ConnectionConfig,
  TransactionContext,
  DatabaseAdapter,
  AdapterConfig,
  AdapterFactory,
} from './types';

// Factory functions
export {
  createAdapter,
  getAdapter,
  closeAdapter,
  closeAllAdapters,
  getDatabaseType,
  parseConnectionString,
  isSupportedDatabaseType,
  getSupportedDatabaseTypes,
  getDatabaseTypeInfo,
} from './factory';

// Individual adapters (for advanced use)
export { PostgreSQLAdapter, createPostgreSQLAdapter } from './adapters/postgresql';
export { mapPgTypeToFieldType, PG_TYPE_MAP } from './adapters/postgresql/type-map';

export { MySQLAdapter, createMySQLAdapter } from './adapters/mysql';
export { mapMySQLTypeToFieldType, MYSQL_TYPE_MAP } from './adapters/mysql/type-map';

export { MongoDBAdapter, createMongoDBAdapter } from './adapters/mongodb';
export {
  inferFieldType,
  inferSchemaFromDocuments,
  flattenDocument,
} from './adapters/mongodb/schema-inference';

export { SQLServerAdapter, createSQLServerAdapter } from './adapters/sqlserver';
export { mapSQLServerTypeToFieldType, SQLSERVER_TYPE_MAP } from './adapters/sqlserver/type-map';
