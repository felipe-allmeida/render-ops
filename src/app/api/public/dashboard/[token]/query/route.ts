import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAdapter, DatabaseAdapter } from '@/lib/database';
import { z } from 'zod';
import type { FilterGroup } from '@/lib/dashboard-components';

interface RouteParams {
  params: Promise<{ token: string }>;
}

// Filter schemas
const filterOperatorSchema = z.enum([
  'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
  'contains', 'starts_with', 'ends_with',
  'in', 'not_in', 'is_null', 'is_not_null'
]);

const widgetFilterSchema = z.object({
  id: z.string(),
  column: z.string(),
  operator: filterOperatorSchema,
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
    z.array(z.number()),
    z.null()
  ]).optional(),
});

const filterGroupSchema = z.object({
  logic: z.enum(['AND', 'OR']),
  filters: z.array(widgetFilterSchema),
});

const querySchema = z.object({
  widgetId: z.string(),
  connectionId: z.string(),
  table: z.string().optional(),
  aggregation: z.enum(['count', 'sum', 'avg', 'min', 'max']).optional(),
  field: z.string().optional(),
  groupBy: z.string().optional(),
  datePeriod: z.enum(['day', 'week', 'month', 'year']).optional(),
  filters: filterGroupSchema.optional(),
  page: z.number().optional(),
  limit: z.number().optional(),
});

// POST /api/public/dashboard/:token/query - Execute widget query for public dashboard
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Verify dashboard is public and not expired
    const dashboard = await prisma.dashboard.findUnique({
      where: { shareToken: token },
      select: {
        id: true,
        isPublic: true,
        shareExpiresAt: true,
        widgets: true,
        connections: {
          select: {
            connection: {
              select: {
                id: true,
                connectionString: true,
              },
            },
          },
        },
      },
    });

    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    if (!dashboard.isPublic) {
      return NextResponse.json({ error: 'Dashboard is not public' }, { status: 403 });
    }

    if (dashboard.shareExpiresAt && new Date() > dashboard.shareExpiresAt) {
      return NextResponse.json({ error: 'Share link has expired' }, { status: 410 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = querySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { connectionId, table, aggregation, field, groupBy, datePeriod, filters, page = 1, limit = 100 } = validation.data;

    // Verify the connection is part of this dashboard
    const dashboardConnection = dashboard.connections.find(
      (dc) => dc.connection.id === connectionId
    );

    if (!dashboardConnection) {
      return NextResponse.json(
        { error: 'Connection not authorized for this dashboard' },
        { status: 403 }
      );
    }

    const connection = dashboardConnection.connection;

    // Get database adapter
    const adapter = getAdapter(connection.connectionString);

    // Build and execute query
    const safeTable = table ? sanitizeIdentifier(table) : null;

    // Build WHERE clause from filters
    const { clause: whereClause, params: whereParams, nextIndex } = buildWhereClause(
      filters as FilterGroup | undefined,
      adapter,
      1
    );

    if (aggregation && safeTable) {
      // Aggregation query (COUNT, SUM, AVG, MIN, MAX)
      let sql: string;
      let queryResult;

      if (aggregation === 'count' && !field) {
        // COUNT(*) - no field needed
        if (groupBy) {
          const safeGroupBy = sanitizeIdentifier(groupBy);

          // Build date grouping expression based on database type
          const groupByExpr = datePeriod
            ? buildDateTruncExpr(adapter, safeGroupBy, datePeriod)
            : adapter.escapeIdentifier(safeGroupBy);

          // Order by label (date) for time series, by value for categories
          const orderBy = datePeriod ? 'label ASC' : 'value DESC';

          // Build pagination clause
          const pagination = adapter.buildPaginationClause(nextIndex, limit, 0);

          sql = `
            SELECT ${groupByExpr} as label, COUNT(*) as value
            FROM ${adapter.escapeIdentifier(safeTable)}
            ${whereClause}
            GROUP BY ${groupByExpr}
            ORDER BY ${orderBy}
            ${pagination.clause}
          `;
          queryResult = await adapter.query(sql, [...whereParams, ...pagination.params]);
          // Convert value to number and format date labels
          const parsedResult = queryResult.rows.map((row: Record<string, unknown>) => ({
            label: datePeriod ? formatDateLabel(row.label, datePeriod) : row.label,
            value: Number(row.value) || 0,
          }));
          return NextResponse.json({
            success: true,
            data: parsedResult,
            type: 'grouped',
          });
        } else {
          sql = `SELECT COUNT(*) as value FROM ${adapter.escapeIdentifier(safeTable)} ${whereClause}`;
          queryResult = await adapter.query(sql, whereParams);
          const row = queryResult.rows[0] as Record<string, unknown> | undefined;
          return NextResponse.json({
            success: true,
            data: parseInt(String(row?.value ?? '0'), 10),
            type: 'single',
          });
        }
      } else if (field) {
        // Aggregation with specific field
        const safeField = sanitizeIdentifier(field);

        if (groupBy) {
          const safeGroupBy = sanitizeIdentifier(groupBy);

          // Build date grouping expression based on database type
          const groupByExpr = datePeriod
            ? buildDateTruncExpr(adapter, safeGroupBy, datePeriod)
            : adapter.escapeIdentifier(safeGroupBy);

          // Order by label (date) for time series, by value for categories
          const orderBy = datePeriod ? 'label ASC' : 'value DESC';

          // Build pagination clause
          const pagination = adapter.buildPaginationClause(nextIndex, limit, 0);

          sql = `
            SELECT ${groupByExpr} as label, ${aggregation.toUpperCase()}(${adapter.escapeIdentifier(safeField)}) as value
            FROM ${adapter.escapeIdentifier(safeTable)}
            ${whereClause}
            GROUP BY ${groupByExpr}
            ORDER BY ${orderBy}
            ${pagination.clause}
          `;
          queryResult = await adapter.query(sql, [...whereParams, ...pagination.params]);
          // Convert value to number and format date labels
          const parsedResult = queryResult.rows.map((row: Record<string, unknown>) => ({
            label: datePeriod ? formatDateLabel(row.label, datePeriod) : row.label,
            value: Number(row.value) || 0,
          }));
          return NextResponse.json({
            success: true,
            data: parsedResult,
            type: 'grouped',
          });
        } else {
          sql = `SELECT ${aggregation.toUpperCase()}(${adapter.escapeIdentifier(safeField)}) as value FROM ${adapter.escapeIdentifier(safeTable)} ${whereClause}`;
          queryResult = await adapter.query(sql, whereParams);
          const row = queryResult.rows[0] as Record<string, unknown> | undefined;
          return NextResponse.json({
            success: true,
            data: Number(row?.value) || 0,
            type: 'single',
          });
        }
      } else {
        // Non-count aggregation without field - invalid
        return NextResponse.json(
          { error: `${aggregation} aggregation requires a field` },
          { status: 400 }
        );
      }
    } else if (safeTable && !aggregation) {
      // Simple table query with pagination
      const offset = (page - 1) * limit;

      // Get total count with filters
      const countSql = `SELECT COUNT(*) as count FROM ${adapter.escapeIdentifier(safeTable)} ${whereClause}`;
      const countResult = await adapter.query(countSql, whereParams);
      const countRow = countResult.rows[0] as Record<string, unknown> | undefined;
      const total = parseInt(String(countRow?.count ?? '0'), 10);

      // Build pagination clause
      const pagination = adapter.buildPaginationClause(nextIndex, limit, offset);

      // Get data with filters (SQL Server requires ORDER BY for OFFSET/FETCH)
      const dataSql = `SELECT * FROM ${adapter.escapeIdentifier(safeTable)} ${whereClause} ORDER BY 1 ${pagination.clause}`;
      const dataResult = await adapter.query(dataSql, [...whereParams, ...pagination.params]);

      return NextResponse.json({
        success: true,
        data: {
          items: dataResult.rows,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
        type: 'table',
      });
    }

    return NextResponse.json(
      { error: 'Invalid query configuration. Provide table with optional aggregation.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error executing public query:', error);
    return NextResponse.json(
      {
        error: 'Query execution failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Sanitize SQL identifiers to prevent SQL injection
function sanitizeIdentifier(identifier: string): string {
  // Only allow alphanumeric and underscore
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new Error(`Invalid identifier: ${identifier}`);
  }
  return identifier;
}

// Build date truncation expression based on database type
function buildDateTruncExpr(
  adapter: DatabaseAdapter,
  column: string,
  period: string
): string {
  const escapedCol = adapter.escapeIdentifier(column);

  switch (adapter.type) {
    case 'postgresql':
      return `date_trunc('${period}', ${escapedCol})`;

    case 'mysql':
      switch (period) {
        case 'day':
          return `DATE(${escapedCol})`;
        case 'week':
          return `DATE(DATE_SUB(${escapedCol}, INTERVAL WEEKDAY(${escapedCol}) DAY))`;
        case 'month':
          return `DATE_FORMAT(${escapedCol}, '%Y-%m-01')`;
        case 'year':
          return `DATE_FORMAT(${escapedCol}, '%Y-01-01')`;
        default:
          return escapedCol;
      }

    case 'sqlserver':
      switch (period) {
        case 'day':
          return `CAST(${escapedCol} AS DATE)`;
        case 'week':
          return `DATEADD(DAY, 1-DATEPART(WEEKDAY, ${escapedCol}), CAST(${escapedCol} AS DATE))`;
        case 'month':
          return `DATEFROMPARTS(YEAR(${escapedCol}), MONTH(${escapedCol}), 1)`;
        case 'year':
          return `DATEFROMPARTS(YEAR(${escapedCol}), 1, 1)`;
        default:
          return escapedCol;
      }

    default:
      // Fallback to PostgreSQL syntax
      return `date_trunc('${period}', ${escapedCol})`;
  }
}

// Format date labels based on period
function formatDateLabel(value: unknown, period: string): string {
  if (!value) return '';

  const date = new Date(value as string);
  if (isNaN(date.getTime())) return String(value);

  switch (period) {
    case 'day':
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    case 'week':
      return `Sem ${getWeekNumber(date)}/${date.getFullYear()}`;
    case 'month':
      return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
    case 'year':
      return date.getFullYear().toString();
    default:
      return String(value);
  }
}

// Get ISO week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Build WHERE clause from filters
function buildWhereClause(
  filters: FilterGroup | undefined,
  adapter: DatabaseAdapter,
  startParamIndex: number
): { clause: string; params: unknown[]; nextIndex: number } {
  if (!filters?.filters.length) {
    return { clause: '', params: [], nextIndex: startParamIndex };
  }

  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = startParamIndex;

  for (const f of filters.filters) {
    const col = adapter.escapeIdentifier(sanitizeIdentifier(f.column));

    // Null operators (no value needed)
    if (f.operator === 'is_null') {
      conditions.push(`${col} IS NULL`);
      continue;
    }
    if (f.operator === 'is_not_null') {
      conditions.push(`${col} IS NOT NULL`);
      continue;
    }

    // IN/NOT IN operators
    if (f.operator === 'in' || f.operator === 'not_in') {
      const vals = Array.isArray(f.value) ? f.value : [f.value];
      if (vals.length === 0) continue;
      const placeholders = vals.map((_, i) =>
        adapter.buildParameterPlaceholder(idx + i)
      ).join(', ');
      conditions.push(`${col} ${f.operator === 'in' ? 'IN' : 'NOT IN'} (${placeholders})`);
      params.push(...vals);
      idx += vals.length;
      continue;
    }

    // Standard operators
    const opMap: Record<string, string> = {
      eq: '=',
      neq: adapter.type === 'sqlserver' ? '<>' : '!=',
      gt: '>',
      gte: '>=',
      lt: '<',
      lte: '<=',
    };

    // Handle text search operators (LIKE/ILIKE)
    if (f.operator === 'contains' || f.operator === 'starts_with' || f.operator === 'ends_with') {
      let pattern = String(f.value);
      if (f.operator === 'contains') pattern = `%${pattern}%`;
      else if (f.operator === 'starts_with') pattern = `${pattern}%`;
      else if (f.operator === 'ends_with') pattern = `%${pattern}`;

      // SQL Server and MySQL use LIKE (case-insensitive depends on collation)
      // PostgreSQL uses ILIKE for case-insensitive
      const likeOp = adapter.type === 'postgresql' ? 'ILIKE' : 'LIKE';
      conditions.push(`${col} ${likeOp} ${adapter.buildParameterPlaceholder(idx)}`);
      params.push(pattern);
      idx++;
      continue;
    }

    // Format date values for SQL Server compatibility
    let val = f.value;
    if (typeof val === 'string' && val.includes('T')) {
      // Convert ISO format to SQL Server compatible format
      val = val.replace('T', ' ');
      if (!val.includes(':00:')) {
        val = val.length === 16 ? `${val}:00` : val;
      }
    }

    conditions.push(`${col} ${opMap[f.operator]} ${adapter.buildParameterPlaceholder(idx)}`);
    params.push(val);
    idx++;
  }

  if (conditions.length === 0) {
    return { clause: '', params: [], nextIndex: startParamIndex };
  }

  const logic = filters.logic === 'OR' ? ' OR ' : ' AND ';
  return {
    clause: `WHERE ${conditions.join(logic)}`,
    params,
    nextIndex: idx
  };
}
