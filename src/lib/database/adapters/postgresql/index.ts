/**
 * PostgreSQL Database Adapter
 *
 * Implements the DatabaseAdapter interface for PostgreSQL databases.
 */

import { Pool, PoolClient } from 'pg';
import {
  DatabaseAdapter,
  DatabaseType,
  AdapterConfig,
  ConnectionTestResult,
  TableInfo,
  TableSchema,
  ColumnSchema,
  ListOptions,
  SearchOptions,
  PaginatedResult,
  QueryResult,
  TransactionContext,
  FieldType,
} from '../../types';
import { mapPgTypeToFieldType } from './type-map';

export class PostgreSQLAdapter implements DatabaseAdapter {
  readonly type: DatabaseType = 'postgresql';
  private pool: Pool | null = null;
  private config: AdapterConfig;

  constructor(config: AdapterConfig) {
    this.config = config;
  }

  get isConnected(): boolean {
    return this.pool !== null;
  }

  // ============================================
  // Connection Management
  // ============================================

  async connect(): Promise<void> {
    if (this.pool) {
      return;
    }

    // Check if SSL is specified in connection string
    const connectionString = this.config.connectionString;
    const hasSSLParam = connectionString.includes('sslmode=') || connectionString.includes('ssl=');

    this.pool = new Pool({
      connectionString: this.config.connectionString,
      max: this.config.poolSize ?? 5,
      idleTimeoutMillis: this.config.idleTimeout ?? 30000,
      connectionTimeoutMillis: this.config.connectionTimeout ?? 10000,
      // Enable SSL for cloud databases if not explicitly configured
      ssl: hasSSLParam ? undefined : { rejectUnauthorized: false },
    });
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const startTime = Date.now();

    try {
      await this.ensureConnected();
      const result = await this.pool!.query('SELECT version()');
      const version = result.rows[0]?.version as string;

      return {
        success: true,
        version: version?.split(' ').slice(0, 2).join(' '),
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
        latencyMs: Date.now() - startTime,
      };
    }
  }

  // ============================================
  // Schema Operations
  // ============================================

  async listTables(): Promise<TableInfo[]> {
    await this.ensureConnected();

    const result = await this.pool!.query<{
      table_name: string;
      table_type: string;
      table_schema: string;
    }>(`
      SELECT table_name, table_type, table_schema
      FROM information_schema.tables
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY table_schema, table_name
    `);

    return result.rows.map((row) => ({
      name: row.table_name,
      type: row.table_type === 'VIEW' ? 'view' : 'table',
      schema: row.table_schema,
    }));
  }

  async getTableSchema(table: string): Promise<TableSchema> {
    await this.ensureConnected();

    // Get column information
    const columnsResult = await this.pool!.query<{
      column_name: string;
      data_type: string;
      udt_name: string;
      is_nullable: string;
      column_default: string | null;
      character_maximum_length: number | null;
      numeric_precision: number | null;
      numeric_scale: number | null;
    }>(
      `
      SELECT
        column_name,
        data_type,
        udt_name,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns
      WHERE table_name = $1
        AND table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY ordinal_position
    `,
      [table]
    );

    // Get primary key information
    const pkResult = await this.pool!.query<{ column_name: string }>(
      `
      SELECT a.attname as column_name
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      JOIN pg_class c ON c.oid = i.indrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = $1
        AND i.indisprimary
        AND n.nspname NOT IN ('pg_catalog', 'information_schema')
    `,
      [table]
    );

    const primaryKeys = new Set(pkResult.rows.map((r) => r.column_name));

    // Get foreign key information
    const fkResult = await this.pool!.query<{
      column_name: string;
      foreign_table_name: string;
      foreign_column_name: string;
    }>(
      `
      SELECT
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = $1
    `,
      [table]
    );

    const foreignKeys = new Map(
      fkResult.rows.map((r) => [
        r.column_name,
        { table: r.foreign_table_name, column: r.foreign_column_name },
      ])
    );

    // Build column schemas
    const columns: ColumnSchema[] = columnsResult.rows.map((col) => {
      const isAutoIncrement =
        col.column_default?.includes('nextval') ||
        col.data_type === 'serial' ||
        col.data_type === 'bigserial' ||
        col.data_type === 'smallserial';

      return {
        name: col.column_name,
        type: col.udt_name || col.data_type,
        fieldType: mapPgTypeToFieldType(col.udt_name || col.data_type),
        nullable: col.is_nullable === 'YES',
        defaultValue: isAutoIncrement ? undefined : col.column_default,
        isPrimaryKey: primaryKeys.has(col.column_name),
        isAutoIncrement,
        maxLength: col.character_maximum_length ?? undefined,
        precision: col.numeric_precision ?? undefined,
        scale: col.numeric_scale ?? undefined,
        references: foreignKeys.get(col.column_name),
      };
    });

    return {
      name: table,
      columns,
      primaryKey: Array.from(primaryKeys),
    };
  }

  // ============================================
  // CRUD Operations
  // ============================================

  async list(table: string, options: ListOptions = {}): Promise<PaginatedResult> {
    await this.ensureConnected();

    const {
      page = 1,
      limit = 20,
      where,
      orderBy,
      orderDirection = 'asc',
      columns,
    } = options;

    const selectCols = columns?.length
      ? columns.map((c) => this.escapeIdentifier(this.sanitizeIdentifier(c))).join(', ')
      : '*';

    let sql = `SELECT ${selectCols} FROM ${this.escapeIdentifier(this.sanitizeIdentifier(table))}`;
    const params: unknown[] = [];
    let paramIndex = 1;

    // WHERE clause
    if (where && Object.keys(where).length > 0) {
      const conditions: string[] = [];
      for (const [key, value] of Object.entries(where)) {
        const colName = this.escapeIdentifier(this.sanitizeIdentifier(key));
        if (value === null) {
          conditions.push(`${colName} IS NULL`);
        } else {
          conditions.push(`${colName} = $${paramIndex}`);
          params.push(value);
          paramIndex++;
        }
      }
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    // ORDER BY
    if (orderBy) {
      const direction = orderDirection === 'desc' ? 'DESC' : 'ASC';
      sql += ` ORDER BY ${this.escapeIdentifier(this.sanitizeIdentifier(orderBy))} ${direction}`;
    }

    // Pagination
    const offset = (page - 1) * limit;
    sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await this.pool!.query(sql, params);

    // Get total count
    let countSql = `SELECT COUNT(*) as total FROM ${this.escapeIdentifier(this.sanitizeIdentifier(table))}`;
    const countParams: unknown[] = [];

    if (where && Object.keys(where).length > 0) {
      const conditions: string[] = [];
      let countParamIndex = 1;
      for (const [key, value] of Object.entries(where)) {
        const colName = this.escapeIdentifier(this.sanitizeIdentifier(key));
        if (value === null) {
          conditions.push(`${colName} IS NULL`);
        } else {
          conditions.push(`${colName} = $${countParamIndex}`);
          countParams.push(value);
          countParamIndex++;
        }
      }
      countSql += ` WHERE ${conditions.join(' AND ')}`;
    }

    const countResult = await this.pool!.query<{ total: string }>(countSql, countParams);
    const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

    return {
      items: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async get(table: string, id: string | number): Promise<Record<string, unknown> | null> {
    await this.ensureConnected();

    const sql = `SELECT * FROM ${this.escapeIdentifier(this.sanitizeIdentifier(table))} WHERE id = $1 LIMIT 1`;
    const result = await this.pool!.query(sql, [id]);

    return result.rows[0] ?? null;
  }

  async insert(
    table: string,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    await this.ensureConnected();

    const columns = Object.keys(data).map((c) => this.sanitizeIdentifier(c));
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`);

    const sql = `
      INSERT INTO ${this.escapeIdentifier(this.sanitizeIdentifier(table))}
      (${columns.map((c) => this.escapeIdentifier(c)).join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;

    const result = await this.pool!.query(sql, values);
    return result.rows[0];
  }

  async update(
    table: string,
    id: string | number,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown> | null> {
    await this.ensureConnected();

    // Remove id from data if present
    const updateData = { ...data };
    delete updateData.id;

    const columns = Object.keys(updateData).map((c) => this.sanitizeIdentifier(c));
    const values = Object.values(updateData);

    if (columns.length === 0) {
      return null;
    }

    const setClause = columns
      .map((col, i) => `${this.escapeIdentifier(col)} = $${i + 1}`)
      .join(', ');

    const sql = `
      UPDATE ${this.escapeIdentifier(this.sanitizeIdentifier(table))}
      SET ${setClause}
      WHERE id = $${columns.length + 1}
      RETURNING *
    `;

    const result = await this.pool!.query(sql, [...values, id]);
    return result.rows[0] ?? null;
  }

  async delete(table: string, id: string | number): Promise<boolean> {
    await this.ensureConnected();

    const sql = `DELETE FROM ${this.escapeIdentifier(this.sanitizeIdentifier(table))} WHERE id = $1 RETURNING id`;
    const result = await this.pool!.query(sql, [id]);

    return result.rowCount !== null && result.rowCount > 0;
  }

  async search(table: string, options: SearchOptions = {}): Promise<PaginatedResult> {
    await this.ensureConnected();

    const {
      page = 1,
      limit = 20,
      search,
      searchColumns,
      filters,
      orderBy,
      orderDirection = 'asc',
    } = options;

    let sql = `SELECT * FROM ${this.escapeIdentifier(this.sanitizeIdentifier(table))}`;
    const params: unknown[] = [];
    let paramIndex = 1;
    const conditions: string[] = [];

    // Full-text search
    if (search && typeof search === 'string' && search.trim()) {
      let columnsToSearch = searchColumns;

      // If no columns specified, get text columns from schema
      if (!columnsToSearch || columnsToSearch.length === 0) {
        const columnsQuery = `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = $1
            AND data_type IN ('text', 'character varying', 'varchar', 'char')
        `;
        const columnRows = await this.pool!.query<{ column_name: string }>(
          columnsQuery,
          [table]
        );
        columnsToSearch = columnRows.rows.map((col) => col.column_name);
      }

      if (columnsToSearch.length > 0) {
        const searchConditions = columnsToSearch.map((col) => {
          return `${this.escapeIdentifier(this.sanitizeIdentifier(col))} ILIKE $${paramIndex}`;
        });
        conditions.push(`(${searchConditions.join(' OR ')})`);
        params.push(`%${search.trim()}%`);
        paramIndex++;
      }
    }

    // Column filters
    if (filters && typeof filters === 'object') {
      for (const [key, value] of Object.entries(filters)) {
        if (key === 'search' || value === null || value === undefined || value === '') {
          continue;
        }

        // Handle date range filters
        if (key.endsWith('_from')) {
          const baseColumn = key.slice(0, -5);
          const colName = this.escapeIdentifier(this.sanitizeIdentifier(baseColumn));
          if (typeof value === 'string' && value.trim()) {
            conditions.push(`${colName} >= $${paramIndex}`);
            params.push(value.trim());
            paramIndex++;
          }
          continue;
        }

        if (key.endsWith('_to')) {
          const baseColumn = key.slice(0, -3);
          const colName = this.escapeIdentifier(this.sanitizeIdentifier(baseColumn));
          if (typeof value === 'string' && value.trim()) {
            let dateValue = value.trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
              dateValue = `${dateValue}T23:59:59.999`;
            }
            conditions.push(`${colName} <= $${paramIndex}`);
            params.push(dateValue);
            paramIndex++;
          }
          continue;
        }

        const colName = this.escapeIdentifier(this.sanitizeIdentifier(key));

        // Handle boolean string values
        if (value === 'true' || value === 'false') {
          conditions.push(`${colName} = $${paramIndex}`);
          params.push(value === 'true');
          paramIndex++;
        } else if (typeof value === 'string' && value.trim()) {
          // Text filter with ILIKE
          conditions.push(`${colName} ILIKE $${paramIndex}`);
          params.push(`%${value.trim()}%`);
          paramIndex++;
        }
      }
    }

    // Add WHERE clause
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    // ORDER BY
    if (orderBy) {
      const direction = orderDirection === 'desc' ? 'DESC' : 'ASC';
      sql += ` ORDER BY ${this.escapeIdentifier(this.sanitizeIdentifier(orderBy))} ${direction}`;
    }

    // Pagination
    const offset = (page - 1) * limit;
    sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await this.pool!.query(sql, params);

    // Get total count
    let countSql = `SELECT COUNT(*) as total FROM ${this.escapeIdentifier(this.sanitizeIdentifier(table))}`;
    if (conditions.length > 0) {
      countSql += ` WHERE ${conditions.join(' AND ')}`;
    }
    const countParams = params.slice(0, -2); // Remove LIMIT and OFFSET

    const countResult = await this.pool!.query<{ total: string }>(countSql, countParams);
    const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

    return {
      items: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================
  // Raw Query
  // ============================================

  async query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    await this.ensureConnected();

    const result = await this.pool!.query(sql, params);

    return {
      rows: result.rows as T[],
      rowCount: result.rowCount ?? 0,
    };
  }

  // ============================================
  // Transaction Support
  // ============================================

  async beginTransaction(): Promise<TransactionContext> {
    await this.ensureConnected();

    const client = await this.pool!.connect();
    await client.query('BEGIN');

    return {
      commit: async () => {
        try {
          await client.query('COMMIT');
        } finally {
          client.release();
        }
      },
      rollback: async () => {
        try {
          await client.query('ROLLBACK');
        } finally {
          client.release();
        }
      },
    };
  }

  // ============================================
  // Utility Methods
  // ============================================

  buildParameterPlaceholder(index: number): string {
    return `$${index}`;
  }

  escapeIdentifier(name: string): string {
    return `"${name.replace(/"/g, '""')}"`;
  }

  mapTypeToFieldType(nativeType: string): FieldType {
    return mapPgTypeToFieldType(nativeType);
  }

  buildPaginationClause(
    limitParamIndex: number,
    limit: number,
    offset: number = 0
  ): { clause: string; params: unknown[]; nextIndex: number } {
    if (offset > 0) {
      const limitParam = this.buildParameterPlaceholder(limitParamIndex);
      const offsetParam = this.buildParameterPlaceholder(limitParamIndex + 1);
      return {
        clause: `LIMIT ${limitParam} OFFSET ${offsetParam}`,
        params: [limit, offset],
        nextIndex: limitParamIndex + 2,
      };
    }
    const limitParam = this.buildParameterPlaceholder(limitParamIndex);
    return {
      clause: `LIMIT ${limitParam}`,
      params: [limit],
      nextIndex: limitParamIndex + 1,
    };
  }

  // ============================================
  // Private Methods
  // ============================================

  private async ensureConnected(): Promise<void> {
    if (!this.pool) {
      await this.connect();
    }
  }

  private sanitizeIdentifier(name: string): string {
    // Only allow alphanumeric and underscores
    return name.replace(/[^a-zA-Z0-9_]/g, '');
  }
}

/**
 * Create a new PostgreSQL adapter
 */
export function createPostgreSQLAdapter(config: AdapterConfig): PostgreSQLAdapter {
  return new PostgreSQLAdapter(config);
}
