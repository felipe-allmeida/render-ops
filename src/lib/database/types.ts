/**
 * Database Abstraction Types
 *
 * Common interfaces and types for multi-database support.
 */

export type DatabaseType = 'postgresql' | 'mysql' | 'mongodb' | 'sqlserver';

export type FieldType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'time'
  | 'currency'
  | 'json'
  | 'binary'
  | 'uuid'
  | 'array';

export interface ColumnSchema {
  name: string;
  type: string; // Native database type (e.g., 'varchar', 'int4', 'ObjectId')
  fieldType: FieldType; // Normalized field type for UI
  nullable: boolean;
  defaultValue?: unknown;
  isPrimaryKey: boolean;
  isAutoIncrement: boolean;
  maxLength?: number;
  precision?: number;
  scale?: number;
  enumValues?: string[];
  references?: {
    table: string;
    column: string;
  };
}

export interface TableSchema {
  name: string;
  columns: ColumnSchema[];
  primaryKey: string[];
  indexes?: {
    name: string;
    columns: string[];
    unique: boolean;
  }[];
}

export interface TableInfo {
  name: string;
  type: 'table' | 'view' | 'collection'; // 'collection' for MongoDB
  schema?: string; // For databases with schema support (pg, mssql)
}

export interface ListOptions {
  page?: number;
  limit?: number;
  where?: Record<string, unknown>;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  columns?: string[]; // Select specific columns
}

export interface SearchOptions extends ListOptions {
  search?: string; // Full-text search term
  searchColumns?: string[]; // Columns to search in
  filters?: Record<string, unknown>; // Column-specific filters
}

export interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number;
  totalCount?: number; // For paginated results
}

export interface PaginatedResult<T = Record<string, unknown>> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ConnectionTestResult {
  success: boolean;
  version?: string;
  error?: string;
  latencyMs?: number;
}

export interface ConnectionConfig {
  type: DatabaseType;
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean | object;
  options?: Record<string, unknown>;
}

export interface TransactionContext {
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

/**
 * Database Adapter Interface
 *
 * All database adapters must implement this interface to ensure
 * consistent behavior across different database types.
 */
export interface DatabaseAdapter {
  /** The type of database this adapter supports */
  readonly type: DatabaseType;

  /** Whether this adapter is currently connected */
  readonly isConnected: boolean;

  // ============================================
  // Connection Management
  // ============================================

  /**
   * Establish connection to the database
   */
  connect(): Promise<void>;

  /**
   * Close the database connection
   */
  disconnect(): Promise<void>;

  /**
   * Test the database connection
   */
  testConnection(): Promise<ConnectionTestResult>;

  // ============================================
  // Schema Operations
  // ============================================

  /**
   * List all tables/collections in the database
   */
  listTables(): Promise<TableInfo[]>;

  /**
   * Get the schema for a specific table/collection
   */
  getTableSchema(table: string): Promise<TableSchema>;

  // ============================================
  // CRUD Operations
  // ============================================

  /**
   * List records with pagination and filtering
   */
  list(table: string, options?: ListOptions): Promise<PaginatedResult>;

  /**
   * Get a single record by ID
   */
  get(table: string, id: string | number): Promise<Record<string, unknown> | null>;

  /**
   * Insert a new record
   */
  insert(
    table: string,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>>;

  /**
   * Update an existing record
   */
  update(
    table: string,
    id: string | number,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown> | null>;

  /**
   * Delete a record
   */
  delete(table: string, id: string | number): Promise<boolean>;

  /**
   * Search records with full-text search and filters
   */
  search(table: string, options?: SearchOptions): Promise<PaginatedResult>;

  // ============================================
  // Raw Query (optional, for advanced use)
  // ============================================

  /**
   * Execute a raw query (use with caution)
   */
  query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<QueryResult<T>>;

  // ============================================
  // Transaction Support (optional)
  // ============================================

  /**
   * Begin a transaction
   */
  beginTransaction?(): Promise<TransactionContext>;

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Build a parameter placeholder for the database
   * PostgreSQL: $1, $2, ...
   * MySQL: ?, ?, ...
   * SQL Server: @p1, @p2, ...
   */
  buildParameterPlaceholder(index: number): string;

  /**
   * Escape an identifier (table/column name)
   * PostgreSQL: "name"
   * MySQL: `name`
   * SQL Server: [name]
   */
  escapeIdentifier(name: string): string;

  /**
   * Map a native database type to a normalized field type
   */
  mapTypeToFieldType(nativeType: string): FieldType;
}

/**
 * Base configuration for creating an adapter
 */
export interface AdapterConfig {
  connectionString: string;
  poolSize?: number;
  idleTimeout?: number;
  connectionTimeout?: number;
}

/**
 * Factory function type for creating adapters
 */
export type AdapterFactory = (config: AdapterConfig) => DatabaseAdapter;
