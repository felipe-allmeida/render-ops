import { query, getClient } from '@/lib/pg-client';
import { ActionResult, ActionParams } from './index';

// List of allowed system tables that should never be accessed
const BLOCKED_TABLES = ['pg_', 'information_schema', 'audit_log'];

/**
 * Validate table name for security
 */
function validateTableName(table: string): boolean {
  // Only allow alphanumeric and underscores
  const tableNameRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  if (!tableNameRegex.test(table)) {
    return false;
  }

  // Block system tables
  const lowerTable = table.toLowerCase();
  return !BLOCKED_TABLES.some((blocked) => lowerTable.startsWith(blocked));
}

/**
 * Sanitize column names to prevent SQL injection
 */
function sanitizeColumnName(col: string): string {
  return col.replace(/[^a-zA-Z0-9_]/g, '');
}

/**
 * db_list - List records with pagination and filtering
 */
export async function dbList(
  params: ActionParams,
  _userId: string,
  connectionString?: string
): Promise<ActionResult> {
  try {
    const { table, page = 1, limit = 20, where, orderBy, orderDirection = 'asc' } = params;

    if (!table || !connectionString) {
      return { success: false, error: 'Missing required parameters' };
    }

    if (!validateTableName(table)) {
      return { success: false, error: 'Invalid table name' };
    }

    // Build query
    let sql = `SELECT * FROM "${sanitizeColumnName(table)}"`;
    const queryParams: unknown[] = [];
    let paramIndex = 1;

    // Add WHERE clause if provided
    if (where && Object.keys(where).length > 0) {
      const conditions: string[] = [];
      for (const [key, value] of Object.entries(where)) {
        const colName = sanitizeColumnName(key);
        if (value === null) {
          conditions.push(`"${colName}" IS NULL`);
        } else {
          conditions.push(`"${colName}" = $${paramIndex}`);
          queryParams.push(value);
          paramIndex++;
        }
      }
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Add ORDER BY
    if (orderBy) {
      const colName = sanitizeColumnName(orderBy);
      const direction = orderDirection === 'desc' ? 'DESC' : 'ASC';
      sql += ` ORDER BY "${colName}" ${direction}`;
    }

    // Add pagination
    const offset = (page - 1) * limit;
    sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    const rows = await query(connectionString, sql, queryParams);

    // Get total count
    let countSql = `SELECT COUNT(*) as total FROM "${sanitizeColumnName(table)}"`;
    const countParams: unknown[] = [];
    if (where && Object.keys(where).length > 0) {
      const conditions: string[] = [];
      let countParamIndex = 1;
      for (const [key, value] of Object.entries(where)) {
        const colName = sanitizeColumnName(key);
        if (value === null) {
          conditions.push(`"${colName}" IS NULL`);
        } else {
          conditions.push(`"${colName}" = $${countParamIndex}`);
          countParams.push(value);
          countParamIndex++;
        }
      }
      countSql += ` WHERE ${conditions.join(' AND ')}`;
    }

    const countResult = await query<{ total: string }>(
      connectionString,
      countSql,
      countParams
    );
    const total = parseInt(countResult[0]?.total ?? '0', 10);

    return {
      success: true,
      data: {
        items: rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  } catch (error) {
    console.error('db_list error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Database query failed',
    };
  }
}

/**
 * db_get - Get a single record by ID
 */
export async function dbGet(
  params: ActionParams,
  _userId: string,
  connectionString?: string
): Promise<ActionResult> {
  try {
    const { table, id } = params;

    if (!table || !id || !connectionString) {
      return { success: false, error: 'Missing required parameters' };
    }

    if (!validateTableName(table)) {
      return { success: false, error: 'Invalid table name' };
    }

    const sql = `SELECT * FROM "${sanitizeColumnName(table)}" WHERE id = $1 LIMIT 1`;
    const rows = await query(connectionString, sql, [id]);

    if (rows.length === 0) {
      return { success: false, error: 'Record not found' };
    }

    return { success: true, data: rows[0] };
  } catch (error) {
    console.error('db_get error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Database query failed',
    };
  }
}

/**
 * db_insert - Insert a new record
 */
export async function dbInsert(
  params: ActionParams,
  _userId: string,
  connectionString?: string
): Promise<ActionResult> {
  try {
    const { table, data } = params;

    // Debug logging
    console.log('db_insert called with:', {
      table,
      data,
      hasConnectionString: !!connectionString,
      paramsKeys: Object.keys(params),
    });

    if (!table || !connectionString) {
      return { success: false, error: 'Missing required parameters: table or connection' };
    }

    if (!data || typeof data !== 'object') {
      console.log('db_insert: data validation failed', { data, typeofData: typeof data });
      return { success: false, error: 'Missing required parameter: data' };
    }

    const dataObj = data as Record<string, unknown>;
    const dataKeys = Object.keys(dataObj);

    if (dataKeys.length === 0) {
      return { success: false, error: 'No data provided. Please fill in at least one field.' };
    }

    if (!validateTableName(table)) {
      return { success: false, error: 'Invalid table name' };
    }

    const columns = dataKeys.map(sanitizeColumnName);
    const values = Object.values(dataObj);
    const placeholders = values.map((_, i) => `$${i + 1}`);

    const sql = `
      INSERT INTO "${sanitizeColumnName(table)}" (${columns.map((c) => `"${c}"`).join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;

    const rows = await query(connectionString, sql, values);

    return { success: true, data: rows[0] };
  } catch (error) {
    console.error('db_insert error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Database insert failed',
    };
  }
}

/**
 * db_update - Update an existing record
 */
export async function dbUpdate(
  params: ActionParams,
  _userId: string,
  connectionString?: string
): Promise<ActionResult> {
  try {
    const { table, id, data } = params;

    if (!table || !id || !data || !connectionString) {
      return { success: false, error: 'Missing required parameters' };
    }

    if (!validateTableName(table)) {
      return { success: false, error: 'Invalid table name' };
    }

    // Remove id from data if present
    const updateData = { ...data };
    delete updateData.id;

    const columns = Object.keys(updateData).map(sanitizeColumnName);
    const values = Object.values(updateData);

    if (columns.length === 0) {
      return { success: false, error: 'No data to update' };
    }

    const setClause = columns.map((col, i) => `"${col}" = $${i + 1}`).join(', ');
    const sql = `
      UPDATE "${sanitizeColumnName(table)}"
      SET ${setClause}
      WHERE id = $${columns.length + 1}
      RETURNING *
    `;

    const rows = await query(connectionString, sql, [...values, id]);

    if (rows.length === 0) {
      return { success: false, error: 'Record not found' };
    }

    return { success: true, data: rows[0] };
  } catch (error) {
    console.error('db_update error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Database update failed',
    };
  }
}

/**
 * db_delete - Delete a record
 */
export async function dbDelete(
  params: ActionParams,
  _userId: string,
  connectionString?: string
): Promise<ActionResult> {
  try {
    const { table, id } = params;

    if (!table || !id || !connectionString) {
      return { success: false, error: 'Missing required parameters' };
    }

    if (!validateTableName(table)) {
      return { success: false, error: 'Invalid table name' };
    }

    const sql = `DELETE FROM "${sanitizeColumnName(table)}" WHERE id = $1 RETURNING id`;
    const rows = await query(connectionString, sql, [id]);

    if (rows.length === 0) {
      return { success: false, error: 'Record not found' };
    }

    return { success: true, data: { deleted: true, id } };
  } catch (error) {
    console.error('db_delete error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Database delete failed',
    };
  }
}

/**
 * db_search - Search and filter records with ILIKE for text search
 */
export async function dbSearch(
  params: ActionParams,
  _userId: string,
  connectionString?: string
): Promise<ActionResult> {
  try {
    const { table, search, filters, page = 1, limit = 20, orderBy, orderDirection = 'asc' } = params;

    if (!table || !connectionString) {
      return { success: false, error: 'Missing required parameters' };
    }

    if (!validateTableName(table)) {
      return { success: false, error: 'Invalid table name' };
    }

    // Build query
    let sql = `SELECT * FROM "${sanitizeColumnName(table)}"`;
    const queryParams: unknown[] = [];
    let paramIndex = 1;
    const conditions: string[] = [];

    // Add text search across searchable columns if provided
    if (search && typeof search === 'string' && search.trim()) {
      // Get column info to determine which columns to search
      const columnsQuery = `
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = $1
        AND data_type IN ('text', 'character varying', 'varchar', 'char')
      `;
      const columnRows = await query<{ column_name: string; data_type: string }>(
        connectionString,
        columnsQuery,
        [table]
      );

      if (columnRows.length > 0) {
        const searchConditions = columnRows.map((col) => {
          const colName = sanitizeColumnName(col.column_name);
          const condition = `"${colName}" ILIKE $${paramIndex}`;
          return condition;
        });
        conditions.push(`(${searchConditions.join(' OR ')})`);
        queryParams.push(`%${search.trim()}%`);
        paramIndex++;
      }
    }

    // Add column filters if provided
    if (filters && typeof filters === 'object') {
      const filterObj = filters as Record<string, unknown>;
      for (const [key, value] of Object.entries(filterObj)) {
        // Skip the 'search' key as it's handled above
        if (key === 'search' || value === null || value === undefined || value === '') {
          continue;
        }

        // Handle date range filters (column_from and column_to)
        if (key.endsWith('_from')) {
          const baseColumn = key.slice(0, -5); // Remove '_from' suffix
          const colName = sanitizeColumnName(baseColumn);
          if (typeof value === 'string' && value.trim()) {
            conditions.push(`"${colName}" >= $${paramIndex}`);
            queryParams.push(value.trim());
            paramIndex++;
          }
          continue;
        }

        if (key.endsWith('_to')) {
          const baseColumn = key.slice(0, -3); // Remove '_to' suffix
          const colName = sanitizeColumnName(baseColumn);
          if (typeof value === 'string' && value.trim()) {
            // For date-only values, add end of day to include the whole day
            let dateValue = value.trim();
            // If it's a date without time (YYYY-MM-DD format), add end of day
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
              dateValue = `${dateValue}T23:59:59.999`;
            }
            conditions.push(`"${colName}" <= $${paramIndex}`);
            queryParams.push(dateValue);
            paramIndex++;
          }
          continue;
        }

        const colName = sanitizeColumnName(key);

        // Handle boolean string values
        if (value === 'true' || value === 'false') {
          conditions.push(`"${colName}" = $${paramIndex}`);
          queryParams.push(value === 'true');
          paramIndex++;
        } else if (typeof value === 'string' && value.trim()) {
          // Text filter with ILIKE
          conditions.push(`"${colName}" ILIKE $${paramIndex}`);
          queryParams.push(`%${value.trim()}%`);
          paramIndex++;
        }
      }
    }

    // Add WHERE clause if we have conditions
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Add ORDER BY
    if (orderBy) {
      const colName = sanitizeColumnName(orderBy);
      const direction = orderDirection === 'desc' ? 'DESC' : 'ASC';
      sql += ` ORDER BY "${colName}" ${direction}`;
    }

    // Add pagination
    const offset = (page - 1) * limit;
    sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    const rows = await query(connectionString, sql, queryParams);

    // Get total count with same filters
    let countSql = `SELECT COUNT(*) as total FROM "${sanitizeColumnName(table)}"`;
    if (conditions.length > 0) {
      countSql += ` WHERE ${conditions.join(' AND ')}`;
    }
    const countParams = queryParams.slice(0, -2); // Remove LIMIT and OFFSET params

    const countResult = await query<{ total: string }>(
      connectionString,
      countSql,
      countParams
    );
    const total = parseInt(countResult[0]?.total ?? '0', 10);

    return {
      success: true,
      data: {
        items: rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  } catch (error) {
    console.error('db_search error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Database search failed',
    };
  }
}
