import { getAdapter } from '@/lib/database';
import { ActionResult, ActionParams } from './index';

// List of allowed system tables that should never be accessed
const BLOCKED_TABLES = ['pg_', 'information_schema', 'audit_log', 'system.'];

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

    // Get adapter for the database type
    const adapter = getAdapter(connectionString);

    // Use the adapter's list method
    const result = await adapter.list(table, {
      page,
      limit,
      where: where as Record<string, unknown>,
      orderBy,
      orderDirection,
    });

    return {
      success: true,
      data: result,
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

    console.log('[db_get] params:', { table, id, hasConnectionString: !!connectionString });

    if (!table || !id || !connectionString) {
      console.log('[db_get] Missing params:', { table, id, connectionString: !!connectionString });
      return { success: false, error: 'Missing required parameters' };
    }

    if (!validateTableName(table)) {
      return { success: false, error: 'Invalid table name' };
    }

    // Get adapter for the database type
    const adapter = getAdapter(connectionString);
    console.log('[db_get] adapter type:', adapter.type);

    const record = await adapter.get(table, id);
    console.log('[db_get] record found:', record ? 'yes' : 'no', record ? Object.keys(record) : []);

    if (!record) {
      return { success: false, error: 'Record not found' };
    }

    return { success: true, data: record };
  } catch (error) {
    console.error('[db_get] error:', error);
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

    if (!table || !connectionString) {
      return { success: false, error: 'Missing required parameters: table or connection' };
    }

    if (!data || typeof data !== 'object') {
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

    // Get adapter for the database type
    const adapter = getAdapter(connectionString);

    const inserted = await adapter.insert(table, dataObj);

    return { success: true, data: inserted };
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
    const updateData = { ...(data as Record<string, unknown>) };
    delete updateData.id;
    delete updateData._id;

    if (Object.keys(updateData).length === 0) {
      return { success: false, error: 'No data to update' };
    }

    // Get adapter for the database type
    const adapter = getAdapter(connectionString);

    const updated = await adapter.update(table, id, updateData);

    if (!updated) {
      return { success: false, error: 'Record not found' };
    }

    return { success: true, data: updated };
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

    // Get adapter for the database type
    const adapter = getAdapter(connectionString);

    const deleted = await adapter.delete(table, id);

    if (!deleted) {
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
 * db_search - Search and filter records
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

    // Get adapter for the database type
    const adapter = getAdapter(connectionString);

    // Use the adapter's search method
    const result = await adapter.search(table, {
      page,
      limit,
      search: search as string,
      filters: filters as Record<string, unknown>,
      orderBy,
      orderDirection,
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('db_search error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Database search failed',
    };
  }
}
