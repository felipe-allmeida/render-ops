/**
 * MySQL Database Adapter
 *
 * Implements the DatabaseAdapter interface for MySQL databases.
 * Uses the mysql2 package with promise API.
 */

import mysql, { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
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
import { mapMySQLTypeToFieldType, extractEnumValues } from './type-map';

export class MySQLAdapter implements DatabaseAdapter {
  readonly type: DatabaseType = 'mysql';
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

    // Parse connection string to config
    const url = new URL(this.config.connectionString);

    this.pool = mysql.createPool({
      host: url.hostname,
      port: parseInt(url.port) || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1), // Remove leading /
      waitForConnections: true,
      connectionLimit: this.config.poolSize ?? 5,
      queueLimit: 0,
      connectTimeout: this.config.connectionTimeout ?? 10000,
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
      const [rows] = await this.pool!.query<RowDataPacket[]>('SELECT VERSION() as version');
      const version = rows[0]?.version as string;

      return {
        success: true,
        version: `MySQL ${version}`,
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

    const [rows] = await this.pool!.query<RowDataPacket[]>(`
      SELECT TABLE_NAME as table_name, TABLE_TYPE as table_type
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME
    `);

    return rows.map((row) => ({
      name: row.table_name,
      type: row.table_type === 'VIEW' ? 'view' : 'table',
    }));
  }

  async getTableSchema(table: string): Promise<TableSchema> {
    await this.ensureConnected();

    // Get column information
    const [columns] = await this.pool!.query<RowDataPacket[]>(
      `
      SELECT
        COLUMN_NAME as column_name,
        DATA_TYPE as data_type,
        COLUMN_TYPE as column_type,
        IS_NULLABLE as is_nullable,
        COLUMN_DEFAULT as column_default,
        CHARACTER_MAXIMUM_LENGTH as max_length,
        NUMERIC_PRECISION as numeric_precision,
        NUMERIC_SCALE as numeric_scale,
        COLUMN_KEY as column_key,
        EXTRA as extra
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `,
      [table]
    );

    // Get foreign key information
    const [foreignKeys] = await this.pool!.query<RowDataPacket[]>(
      `
      SELECT
        COLUMN_NAME as column_name,
        REFERENCED_TABLE_NAME as foreign_table,
        REFERENCED_COLUMN_NAME as foreign_column
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `,
      [table]
    );

    const fkMap = new Map(
      foreignKeys.map((fk) => [
        fk.column_name,
        { table: fk.foreign_table, column: fk.foreign_column },
      ])
    );

    const primaryKeys: string[] = [];
    const columnSchemas: ColumnSchema[] = columns.map((col) => {
      const isPrimaryKey = col.column_key === 'PRI';
      if (isPrimaryKey) {
        primaryKeys.push(col.column_name);
      }

      const columnSchema: ColumnSchema = {
        name: col.column_name,
        type: col.column_type,
        fieldType: mapMySQLTypeToFieldType(col.column_type),
        nullable: col.is_nullable === 'YES',
        defaultValue: col.column_default,
        isPrimaryKey,
        isAutoIncrement: col.extra?.includes('auto_increment') ?? false,
        maxLength: col.max_length ?? undefined,
        precision: col.numeric_precision ?? undefined,
        scale: col.numeric_scale ?? undefined,
        references: fkMap.get(col.column_name),
      };

      // Extract enum values if applicable
      if (col.data_type === 'enum') {
        columnSchema.enumValues = extractEnumValues(col.column_type);
      }

      return columnSchema;
    });

    return {
      name: table,
      columns: columnSchemas,
      primaryKey: primaryKeys,
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

    // WHERE clause
    if (where && Object.keys(where).length > 0) {
      const conditions: string[] = [];
      for (const [key, value] of Object.entries(where)) {
        const colName = this.escapeIdentifier(this.sanitizeIdentifier(key));
        if (value === null) {
          conditions.push(`${colName} IS NULL`);
        } else {
          conditions.push(`${colName} = ?`);
          params.push(value);
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
    sql += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await this.pool!.query<RowDataPacket[]>(sql, params);

    // Get total count
    let countSql = `SELECT COUNT(*) as total FROM ${this.escapeIdentifier(this.sanitizeIdentifier(table))}`;
    const countParams: unknown[] = [];

    if (where && Object.keys(where).length > 0) {
      const conditions: string[] = [];
      for (const [key, value] of Object.entries(where)) {
        const colName = this.escapeIdentifier(this.sanitizeIdentifier(key));
        if (value === null) {
          conditions.push(`${colName} IS NULL`);
        } else {
          conditions.push(`${colName} = ?`);
          countParams.push(value);
        }
      }
      countSql += ` WHERE ${conditions.join(' AND ')}`;
    }

    const [countResult] = await this.pool!.query<RowDataPacket[]>(countSql, countParams);
    const total = parseInt(String(countResult[0]?.total ?? 0), 10);

    return {
      items: rows,
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

    const sql = `SELECT * FROM ${this.escapeIdentifier(this.sanitizeIdentifier(table))} WHERE id = ? LIMIT 1`;
    const [rows] = await this.pool!.query<RowDataPacket[]>(sql, [id]);

    return rows[0] ?? null;
  }

  async insert(
    table: string,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    await this.ensureConnected();

    const columns = Object.keys(data).map((c) => this.sanitizeIdentifier(c));
    const values = Object.values(data);
    const placeholders = values.map(() => '?');

    const sql = `
      INSERT INTO ${this.escapeIdentifier(this.sanitizeIdentifier(table))}
      (${columns.map((c) => this.escapeIdentifier(c)).join(', ')})
      VALUES (${placeholders.join(', ')})
    `;

    const [result] = await this.pool!.query<ResultSetHeader>(sql, values);

    // Fetch the inserted row
    const insertedId = result.insertId;
    if (insertedId) {
      const inserted = await this.get(table, insertedId);
      if (inserted) {
        return inserted;
      }
    }

    // Return data with insertId if we can't fetch
    return { ...data, id: insertedId };
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

    const setClause = columns.map((col) => `${this.escapeIdentifier(col)} = ?`).join(', ');

    const sql = `
      UPDATE ${this.escapeIdentifier(this.sanitizeIdentifier(table))}
      SET ${setClause}
      WHERE id = ?
    `;

    const [result] = await this.pool!.query<ResultSetHeader>(sql, [...values, id]);

    if (result.affectedRows === 0) {
      return null;
    }

    return this.get(table, id);
  }

  async delete(table: string, id: string | number): Promise<boolean> {
    await this.ensureConnected();

    const sql = `DELETE FROM ${this.escapeIdentifier(this.sanitizeIdentifier(table))} WHERE id = ?`;
    const [result] = await this.pool!.query<ResultSetHeader>(sql, [id]);

    return result.affectedRows > 0;
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
    const conditions: string[] = [];

    // Full-text search (MySQL uses LIKE by default, which is case-insensitive)
    if (search && typeof search === 'string' && search.trim()) {
      let columnsToSearch = searchColumns;

      // If no columns specified, get text columns from schema
      if (!columnsToSearch || columnsToSearch.length === 0) {
        const [columnRows] = await this.pool!.query<RowDataPacket[]>(
          `
          SELECT COLUMN_NAME as column_name
          FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = ?
            AND DATA_TYPE IN ('varchar', 'char', 'text', 'tinytext', 'mediumtext', 'longtext')
        `,
          [table]
        );
        columnsToSearch = columnRows.map((col) => col.column_name);
      }

      if (columnsToSearch.length > 0) {
        const searchConditions = columnsToSearch.map((col) => {
          return `${this.escapeIdentifier(this.sanitizeIdentifier(col))} LIKE ?`;
        });
        conditions.push(`(${searchConditions.join(' OR ')})`);
        // Add parameter for each column (MySQL reuses same parameter)
        for (let i = 0; i < columnsToSearch.length; i++) {
          params.push(`%${search.trim()}%`);
        }
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
            conditions.push(`${colName} >= ?`);
            params.push(value.trim());
          }
          continue;
        }

        if (key.endsWith('_to')) {
          const baseColumn = key.slice(0, -3);
          const colName = this.escapeIdentifier(this.sanitizeIdentifier(baseColumn));
          if (typeof value === 'string' && value.trim()) {
            let dateValue = value.trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
              dateValue = `${dateValue} 23:59:59`;
            }
            conditions.push(`${colName} <= ?`);
            params.push(dateValue);
          }
          continue;
        }

        const colName = this.escapeIdentifier(this.sanitizeIdentifier(key));

        // Handle boolean string values
        if (value === 'true' || value === 'false') {
          conditions.push(`${colName} = ?`);
          params.push(value === 'true' ? 1 : 0);
        } else if (typeof value === 'string' && value.trim()) {
          // Text filter with LIKE
          conditions.push(`${colName} LIKE ?`);
          params.push(`%${value.trim()}%`);
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
    sql += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await this.pool!.query<RowDataPacket[]>(sql, params);

    // Get total count
    let countSql = `SELECT COUNT(*) as total FROM ${this.escapeIdentifier(this.sanitizeIdentifier(table))}`;
    if (conditions.length > 0) {
      countSql += ` WHERE ${conditions.join(' AND ')}`;
    }
    const countParams = params.slice(0, -2); // Remove LIMIT and OFFSET

    const [countResult] = await this.pool!.query<RowDataPacket[]>(countSql, countParams);
    const total = parseInt(String(countResult[0]?.total ?? 0), 10);

    return {
      items: rows,
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

    const [rows] = await this.pool!.query<RowDataPacket[]>(sql, params);

    return {
      rows: rows as T[],
      rowCount: rows.length,
    };
  }

  // ============================================
  // Transaction Support
  // ============================================

  async beginTransaction(): Promise<TransactionContext> {
    await this.ensureConnected();

    const connection = await this.pool!.getConnection();
    await connection.beginTransaction();

    return {
      commit: async () => {
        try {
          await connection.commit();
        } finally {
          connection.release();
        }
      },
      rollback: async () => {
        try {
          await connection.rollback();
        } finally {
          connection.release();
        }
      },
    };
  }

  // ============================================
  // Utility Methods
  // ============================================

  buildParameterPlaceholder(_index: number): string {
    return '?';
  }

  escapeIdentifier(name: string): string {
    return `\`${name.replace(/`/g, '``')}\``;
  }

  mapTypeToFieldType(nativeType: string): FieldType {
    return mapMySQLTypeToFieldType(nativeType);
  }

  buildPaginationClause(
    _limitParamIndex: number,
    limit: number,
    offset: number = 0
  ): { clause: string; params: unknown[]; nextIndex: number } {
    // MySQL uses ? for all parameters, so index doesn't matter
    if (offset > 0) {
      return {
        clause: `LIMIT ? OFFSET ?`,
        params: [limit, offset],
        nextIndex: _limitParamIndex + 2,
      };
    }
    return {
      clause: `LIMIT ?`,
      params: [limit],
      nextIndex: _limitParamIndex + 1,
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
    return name.replace(/[^a-zA-Z0-9_]/g, '');
  }
}

/**
 * Create a new MySQL adapter
 */
export function createMySQLAdapter(config: AdapterConfig): MySQLAdapter {
  return new MySQLAdapter(config);
}
