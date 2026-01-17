/**
 * SQL Server Database Adapter
 *
 * Implements the DatabaseAdapter interface for SQL Server databases.
 * Uses the mssql package.
 */

import sql, { ConnectionPool, IResult, IRecordSet } from 'mssql';
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
import { mapSQLServerTypeToFieldType } from './type-map';

export class SQLServerAdapter implements DatabaseAdapter {
  readonly type: DatabaseType = 'sqlserver';
  private pool: ConnectionPool | null = null;
  private config: AdapterConfig;

  constructor(config: AdapterConfig) {
    this.config = config;
  }

  get isConnected(): boolean {
    return this.pool !== null && this.pool.connected;
  }

  // ============================================
  // Connection Management
  // ============================================

  async connect(): Promise<void> {
    if (this.pool && this.pool.connected) {
      return;
    }

    // Parse connection string to config
    const connectionConfig = this.parseConnectionString(this.config.connectionString);

    this.pool = await sql.connect({
      ...connectionConfig,
      pool: {
        max: this.config.poolSize ?? 5,
        idleTimeoutMillis: this.config.idleTimeout ?? 30000,
      },
      options: {
        trustServerCertificate: true,
        connectTimeout: this.config.connectionTimeout ?? 10000,
      },
    });
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
    }
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const startTime = Date.now();

    try {
      await this.ensureConnected();
      const result = await this.pool!.request().query('SELECT @@VERSION as version');
      const version = result.recordset[0]?.version as string;

      // Extract just the version number
      const versionMatch = version?.match(/Microsoft SQL Server (\d+)/);
      const shortVersion = versionMatch ? `SQL Server ${versionMatch[1]}` : 'SQL Server';

      return {
        success: true,
        version: shortVersion,
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

    const result = await this.pool!.request().query(`
      SELECT TABLE_NAME as table_name, TABLE_TYPE as table_type, TABLE_SCHEMA as table_schema
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE IN ('BASE TABLE', 'VIEW')
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `);

    return result.recordset.map((row) => ({
      name: row.table_name,
      type: row.table_type === 'VIEW' ? 'view' : 'table',
      schema: row.table_schema,
    }));
  }

  async getTableSchema(table: string): Promise<TableSchema> {
    await this.ensureConnected();

    // Get column information
    const columnsResult = await this.pool!.request()
      .input('table', sql.VarChar, table)
      .query(`
        SELECT
          c.COLUMN_NAME as column_name,
          c.DATA_TYPE as data_type,
          c.IS_NULLABLE as is_nullable,
          c.COLUMN_DEFAULT as column_default,
          c.CHARACTER_MAXIMUM_LENGTH as max_length,
          c.NUMERIC_PRECISION as precision,
          c.NUMERIC_SCALE as scale,
          COLUMNPROPERTY(OBJECT_ID(c.TABLE_SCHEMA + '.' + c.TABLE_NAME), c.COLUMN_NAME, 'IsIdentity') as is_identity
        FROM INFORMATION_SCHEMA.COLUMNS c
        WHERE c.TABLE_NAME = @table
        ORDER BY c.ORDINAL_POSITION
      `);

    // Get primary key information
    const pkResult = await this.pool!.request()
      .input('table', sql.VarChar, table)
      .query(`
        SELECT COLUMN_NAME as column_name
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE OBJECTPROPERTY(OBJECT_ID(CONSTRAINT_SCHEMA + '.' + CONSTRAINT_NAME), 'IsPrimaryKey') = 1
          AND TABLE_NAME = @table
      `);

    const primaryKeys = new Set(pkResult.recordset.map((r) => r.column_name));

    // Get foreign key information
    const fkResult = await this.pool!.request()
      .input('table', sql.VarChar, table)
      .query(`
        SELECT
          COL_NAME(fc.parent_object_id, fc.parent_column_id) as column_name,
          OBJECT_NAME(fc.referenced_object_id) as foreign_table,
          COL_NAME(fc.referenced_object_id, fc.referenced_column_id) as foreign_column
        FROM sys.foreign_key_columns fc
        INNER JOIN sys.tables t ON t.object_id = fc.parent_object_id
        WHERE t.name = @table
      `);

    const foreignKeys = new Map(
      fkResult.recordset.map((fk) => [
        fk.column_name,
        { table: fk.foreign_table, column: fk.foreign_column },
      ])
    );

    // Build column schemas
    const columns: ColumnSchema[] = columnsResult.recordset.map((col) => ({
      name: col.column_name,
      type: col.data_type,
      fieldType: mapSQLServerTypeToFieldType(col.data_type),
      nullable: col.is_nullable === 'YES',
      defaultValue: col.column_default,
      isPrimaryKey: primaryKeys.has(col.column_name),
      isAutoIncrement: col.is_identity === 1,
      maxLength: col.max_length === -1 ? undefined : col.max_length,
      precision: col.precision ?? undefined,
      scale: col.scale ?? undefined,
      references: foreignKeys.get(col.column_name),
    }));

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

    const request = this.pool!.request();
    let paramIndex = 1;

    let sqlQuery = `SELECT ${selectCols} FROM ${this.escapeIdentifier(this.sanitizeIdentifier(table))}`;
    const conditions: string[] = [];

    // WHERE clause
    if (where && Object.keys(where).length > 0) {
      for (const [key, value] of Object.entries(where)) {
        const colName = this.escapeIdentifier(this.sanitizeIdentifier(key));
        if (value === null) {
          conditions.push(`${colName} IS NULL`);
        } else {
          const paramName = `p${paramIndex}`;
          conditions.push(`${colName} = @${paramName}`);
          request.input(paramName, value);
          paramIndex++;
        }
      }
    }

    if (conditions.length > 0) {
      sqlQuery += ` WHERE ${conditions.join(' AND ')}`;
    }

    // ORDER BY (required for OFFSET/FETCH)
    const orderColumn = orderBy || 'id';
    const direction = orderDirection === 'desc' ? 'DESC' : 'ASC';
    sqlQuery += ` ORDER BY ${this.escapeIdentifier(this.sanitizeIdentifier(orderColumn))} ${direction}`;

    // Pagination using OFFSET/FETCH (SQL Server 2012+)
    const offset = (page - 1) * limit;
    sqlQuery += ` OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;
    request.input('offset', sql.Int, offset);
    request.input('limit', sql.Int, limit);

    const result = await request.query(sqlQuery);

    // Get total count
    const countRequest = this.pool!.request();
    let countSql = `SELECT COUNT(*) as total FROM ${this.escapeIdentifier(this.sanitizeIdentifier(table))}`;
    let countParamIndex = 1;

    if (where && Object.keys(where).length > 0) {
      const countConditions: string[] = [];
      for (const [key, value] of Object.entries(where)) {
        const colName = this.escapeIdentifier(this.sanitizeIdentifier(key));
        if (value === null) {
          countConditions.push(`${colName} IS NULL`);
        } else {
          const paramName = `cp${countParamIndex}`;
          countConditions.push(`${colName} = @${paramName}`);
          countRequest.input(paramName, value);
          countParamIndex++;
        }
      }
      countSql += ` WHERE ${countConditions.join(' AND ')}`;
    }

    const countResult = await countRequest.query(countSql);
    const total = countResult.recordset[0]?.total ?? 0;

    return {
      items: result.recordset,
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

    const result = await this.pool!.request()
      .input('id', id)
      .query(
        `SELECT TOP 1 * FROM ${this.escapeIdentifier(this.sanitizeIdentifier(table))} WHERE id = @id`
      );

    return result.recordset[0] ?? null;
  }

  async insert(
    table: string,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    await this.ensureConnected();

    const columns = Object.keys(data).map((c) => this.sanitizeIdentifier(c));
    const values = Object.values(data);

    const request = this.pool!.request();

    // Add parameters
    columns.forEach((col, i) => {
      request.input(`p${i + 1}`, values[i]);
    });

    const columnList = columns.map((c) => this.escapeIdentifier(c)).join(', ');
    const paramList = columns.map((_, i) => `@p${i + 1}`).join(', ');

    const sql = `
      INSERT INTO ${this.escapeIdentifier(this.sanitizeIdentifier(table))}
      (${columnList})
      OUTPUT INSERTED.*
      VALUES (${paramList})
    `;

    const result = await request.query(sql);

    return result.recordset[0];
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

    const request = this.pool!.request();

    // Add parameters
    columns.forEach((col, i) => {
      request.input(`p${i + 1}`, values[i]);
    });
    request.input('id', id);

    const setClause = columns
      .map((col, i) => `${this.escapeIdentifier(col)} = @p${i + 1}`)
      .join(', ');

    const sql = `
      UPDATE ${this.escapeIdentifier(this.sanitizeIdentifier(table))}
      SET ${setClause}
      OUTPUT INSERTED.*
      WHERE id = @id
    `;

    const result = await request.query(sql);

    return result.recordset[0] ?? null;
  }

  async delete(table: string, id: string | number): Promise<boolean> {
    await this.ensureConnected();

    const result = await this.pool!.request()
      .input('id', id)
      .query(
        `DELETE FROM ${this.escapeIdentifier(this.sanitizeIdentifier(table))} OUTPUT DELETED.id WHERE id = @id`
      );

    return result.recordset.length > 0;
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

    const request = this.pool!.request();
    let paramIndex = 1;
    const conditions: string[] = [];

    // Full-text search
    if (search && typeof search === 'string' && search.trim()) {
      let columnsToSearch = searchColumns;

      // If no columns specified, get text columns from schema
      if (!columnsToSearch || columnsToSearch.length === 0) {
        const schemaResult = await this.pool!.request()
          .input('table', sql.VarChar, table)
          .query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = @table
              AND DATA_TYPE IN ('varchar', 'nvarchar', 'char', 'nchar', 'text', 'ntext')
          `);
        columnsToSearch = schemaResult.recordset.map((r) => r.COLUMN_NAME);
      }

      if (columnsToSearch.length > 0) {
        const searchParam = `p${paramIndex}`;
        const searchConditions = columnsToSearch.map((col) => {
          return `${this.escapeIdentifier(this.sanitizeIdentifier(col))} LIKE @${searchParam}`;
        });
        conditions.push(`(${searchConditions.join(' OR ')})`);
        request.input(searchParam, `%${search.trim()}%`);
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
            const paramName = `p${paramIndex}`;
            conditions.push(`${colName} >= @${paramName}`);
            request.input(paramName, value.trim());
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
              dateValue = `${dateValue}T23:59:59`;
            }
            const paramName = `p${paramIndex}`;
            conditions.push(`${colName} <= @${paramName}`);
            request.input(paramName, dateValue);
            paramIndex++;
          }
          continue;
        }

        const colName = this.escapeIdentifier(this.sanitizeIdentifier(key));
        const paramName = `p${paramIndex}`;

        // Handle boolean string values
        if (value === 'true' || value === 'false') {
          conditions.push(`${colName} = @${paramName}`);
          request.input(paramName, sql.Bit, value === 'true' ? 1 : 0);
        } else if (typeof value === 'string' && value.trim()) {
          // Text filter with LIKE
          conditions.push(`${colName} LIKE @${paramName}`);
          request.input(paramName, `%${value.trim()}%`);
        }
        paramIndex++;
      }
    }

    let sqlQuery = `SELECT * FROM ${this.escapeIdentifier(this.sanitizeIdentifier(table))}`;

    if (conditions.length > 0) {
      sqlQuery += ` WHERE ${conditions.join(' AND ')}`;
    }

    // ORDER BY (required for OFFSET/FETCH)
    const orderColumn = orderBy || 'id';
    const direction = orderDirection === 'desc' ? 'DESC' : 'ASC';
    sqlQuery += ` ORDER BY ${this.escapeIdentifier(this.sanitizeIdentifier(orderColumn))} ${direction}`;

    // Pagination
    const offset = (page - 1) * limit;
    sqlQuery += ` OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;
    request.input('offset', sql.Int, offset);
    request.input('limit', sql.Int, limit);

    const result = await request.query(sqlQuery);

    // Get total count (need a new request for count)
    const countRequest = this.pool!.request();
    let countParamIndex = 1;

    let countSql = `SELECT COUNT(*) as total FROM ${this.escapeIdentifier(this.sanitizeIdentifier(table))}`;

    // Rebuild conditions for count query
    const countConditions: string[] = [];

    if (search && typeof search === 'string' && search.trim()) {
      let columnsToSearch = searchColumns;
      if (!columnsToSearch || columnsToSearch.length === 0) {
        const schemaResult = await this.pool!.request()
          .input('table', sql.VarChar, table)
          .query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = @table
              AND DATA_TYPE IN ('varchar', 'nvarchar', 'char', 'nchar', 'text', 'ntext')
          `);
        columnsToSearch = schemaResult.recordset.map((r) => r.COLUMN_NAME);
      }

      if (columnsToSearch.length > 0) {
        const searchParam = `cp${countParamIndex}`;
        const searchConditions = columnsToSearch.map((col) => {
          return `${this.escapeIdentifier(this.sanitizeIdentifier(col))} LIKE @${searchParam}`;
        });
        countConditions.push(`(${searchConditions.join(' OR ')})`);
        countRequest.input(searchParam, `%${search.trim()}%`);
        countParamIndex++;
      }
    }

    if (filters && typeof filters === 'object') {
      for (const [key, value] of Object.entries(filters)) {
        if (key === 'search' || value === null || value === undefined || value === '') {
          continue;
        }

        if (key.endsWith('_from') || key.endsWith('_to')) {
          const baseColumn = key.endsWith('_from') ? key.slice(0, -5) : key.slice(0, -3);
          const colName = this.escapeIdentifier(this.sanitizeIdentifier(baseColumn));
          if (typeof value === 'string' && value.trim()) {
            let dateValue = value.trim();
            if (key.endsWith('_to') && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
              dateValue = `${dateValue}T23:59:59`;
            }
            const paramName = `cp${countParamIndex}`;
            const op = key.endsWith('_from') ? '>=' : '<=';
            countConditions.push(`${colName} ${op} @${paramName}`);
            countRequest.input(paramName, dateValue);
            countParamIndex++;
          }
          continue;
        }

        const colName = this.escapeIdentifier(this.sanitizeIdentifier(key));
        const paramName = `cp${countParamIndex}`;

        if (value === 'true' || value === 'false') {
          countConditions.push(`${colName} = @${paramName}`);
          countRequest.input(paramName, sql.Bit, value === 'true' ? 1 : 0);
        } else if (typeof value === 'string' && value.trim()) {
          countConditions.push(`${colName} LIKE @${paramName}`);
          countRequest.input(paramName, `%${value.trim()}%`);
        }
        countParamIndex++;
      }
    }

    if (countConditions.length > 0) {
      countSql += ` WHERE ${countConditions.join(' AND ')}`;
    }

    const countResult = await countRequest.query(countSql);
    const total = countResult.recordset[0]?.total ?? 0;

    return {
      items: result.recordset,
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
    sqlQuery: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    await this.ensureConnected();

    const request = this.pool!.request();

    // Add parameters if provided
    if (params) {
      params.forEach((param, i) => {
        request.input(`p${i + 1}`, param);
      });
    }

    const result = await request.query(sqlQuery);

    return {
      rows: result.recordset as T[],
      rowCount: result.recordset.length,
    };
  }

  // ============================================
  // Transaction Support
  // ============================================

  async beginTransaction(): Promise<TransactionContext> {
    await this.ensureConnected();

    const transaction = this.pool!.transaction();
    await transaction.begin();

    return {
      commit: async () => {
        await transaction.commit();
      },
      rollback: async () => {
        await transaction.rollback();
      },
    };
  }

  // ============================================
  // Utility Methods
  // ============================================

  buildParameterPlaceholder(index: number): string {
    return `@p${index}`;
  }

  escapeIdentifier(name: string): string {
    return `[${name.replace(/\]/g, ']]')}]`;
  }

  mapTypeToFieldType(nativeType: string): FieldType {
    return mapSQLServerTypeToFieldType(nativeType);
  }

  // ============================================
  // Private Methods
  // ============================================

  private async ensureConnected(): Promise<void> {
    if (!this.pool || !this.pool.connected) {
      await this.connect();
    }
  }

  private sanitizeIdentifier(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, '');
  }

  private parseConnectionString(connectionString: string): sql.config {
    // Handle different connection string formats
    const lowerConn = connectionString.toLowerCase();

    // mssql:// or sqlserver:// URL format
    if (lowerConn.startsWith('mssql://') || lowerConn.startsWith('sqlserver://')) {
      const url = new URL(connectionString.replace(/^sqlserver:/, 'mssql:'));
      return {
        server: url.hostname,
        port: parseInt(url.port) || 1433,
        user: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        database: url.pathname.slice(1),
      };
    }

    // ADO.NET style connection string
    const config: sql.config = {
      server: '',
      database: '',
    };

    const parts = connectionString.split(';');
    for (const part of parts) {
      const [key, value] = part.split('=').map((s) => s.trim());
      if (!key || !value) continue;

      const lowerKey = key.toLowerCase();

      if (lowerKey === 'server' || lowerKey === 'data source') {
        const [server, port] = value.split(',');
        config.server = server;
        if (port) {
          config.port = parseInt(port);
        }
      } else if (lowerKey === 'database' || lowerKey === 'initial catalog') {
        config.database = value;
      } else if (lowerKey === 'user id' || lowerKey === 'uid') {
        config.user = value;
      } else if (lowerKey === 'password' || lowerKey === 'pwd') {
        config.password = value;
      } else if (lowerKey === 'encrypt') {
        config.options = config.options || {};
        config.options.encrypt = value.toLowerCase() === 'true';
      } else if (lowerKey === 'trustservercertificate') {
        config.options = config.options || {};
        config.options.trustServerCertificate = value.toLowerCase() === 'true';
      }
    }

    return config;
  }
}

/**
 * Create a new SQL Server adapter
 */
export function createSQLServerAdapter(config: AdapterConfig): SQLServerAdapter {
  return new SQLServerAdapter(config);
}
