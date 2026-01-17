import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import { getAdapter } from '@/lib/database';
import { z } from 'zod';
import { ensureTenant, requireTenantPermission } from '@/lib/tenant';

// Schema for widget query
const querySchema = z.object({
  widgetId: z.string(),
  connectionId: z.string(),
  // Either raw SQL query or aggregation params
  query: z.string().optional(),
  // Aggregation mode
  table: z.string().optional(),
  aggregation: z.enum(['count', 'sum', 'avg', 'min', 'max']).optional(),
  field: z.string().optional(),
  groupBy: z.string().optional(),
  datePeriod: z.enum(['day', 'week', 'month', 'year']).optional(), // For date column grouping
  // Pagination for table widgets
  page: z.number().optional(),
  limit: z.number().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/dashboards/[id]/query - Execute a widget query
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get user's tenant
    const tenant = await ensureTenant(session.user.id, session.user.name);

    // Check read permission
    const permission = await requireTenantPermission(session.user.id, tenant.tenantId, 'read');
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.error }, { status: 403 });
    }

    // Verify dashboard exists and belongs to tenant
    const dashboard = await prisma.dashboard.findFirst({
      where: {
        id,
        tenantId: tenant.tenantId,
      },
      include: {
        connections: {
          select: { connectionId: true },
        },
      },
    });

    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    const body = await request.json();
    const validation = querySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { connectionId, table, aggregation, field, groupBy, datePeriod, page = 1, limit = 100 } = validation.data;

    // Verify the connection is associated with this dashboard
    const dashboardConnectionIds = dashboard.connections.map((c) => c.connectionId);
    if (!dashboardConnectionIds.includes(connectionId)) {
      return NextResponse.json(
        { error: 'Connection not associated with this dashboard' },
        { status: 403 }
      );
    }

    // Get the connection details
    const connection = await prisma.connection.findFirst({
      where: {
        id: connectionId,
        tenantId: tenant.tenantId,
      },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Get the database adapter
    const adapter = getAdapter(connection.connectionString);

    // Build and execute query
    const safeTable = table ? sanitizeIdentifier(table) : null;

    if (aggregation && safeTable) {
      // Aggregation query (COUNT, SUM, AVG, MIN, MAX)
      let sql: string;
      let queryResult;

      if (aggregation === 'count' && !field) {
        // COUNT(*) - no field needed
        if (groupBy) {
          const safeGroupBy = sanitizeIdentifier(groupBy);

          // Use date_trunc if datePeriod is specified for date grouping
          const groupByExpr = datePeriod
            ? `date_trunc('${datePeriod}', ${adapter.escapeIdentifier(safeGroupBy)})`
            : adapter.escapeIdentifier(safeGroupBy);

          // Order by label (date) for time series, by value for categories
          const orderBy = datePeriod ? 'label ASC' : 'value DESC';

          sql = `
            SELECT ${groupByExpr} as label, COUNT(*) as value
            FROM ${adapter.escapeIdentifier(safeTable)}
            GROUP BY ${groupByExpr}
            ORDER BY ${orderBy}
            LIMIT ${adapter.buildParameterPlaceholder(1)}
          `;
          queryResult = await adapter.query(sql, [limit]);
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
          sql = `SELECT COUNT(*) as value FROM ${adapter.escapeIdentifier(safeTable)}`;
          queryResult = await adapter.query(sql, []);
          return NextResponse.json({
            success: true,
            data: parseInt(queryResult.rows[0]?.value || '0', 10),
            type: 'single',
          });
        }
      } else if (field) {
        // Aggregation with specific field
        const safeField = sanitizeIdentifier(field);

        if (groupBy) {
          const safeGroupBy = sanitizeIdentifier(groupBy);

          // Use date_trunc if datePeriod is specified for date grouping
          const groupByExpr = datePeriod
            ? `date_trunc('${datePeriod}', ${adapter.escapeIdentifier(safeGroupBy)})`
            : adapter.escapeIdentifier(safeGroupBy);

          // Order by label (date) for time series, by value for categories
          const orderBy = datePeriod ? 'label ASC' : 'value DESC';

          sql = `
            SELECT ${groupByExpr} as label, ${aggregation.toUpperCase()}(${adapter.escapeIdentifier(safeField)}) as value
            FROM ${adapter.escapeIdentifier(safeTable)}
            GROUP BY ${groupByExpr}
            ORDER BY ${orderBy}
            LIMIT ${adapter.buildParameterPlaceholder(1)}
          `;
          queryResult = await adapter.query(sql, [limit]);
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
          sql = `SELECT ${aggregation.toUpperCase()}(${adapter.escapeIdentifier(safeField)}) as value FROM ${adapter.escapeIdentifier(safeTable)}`;
          queryResult = await adapter.query(sql, []);
          return NextResponse.json({
            success: true,
            data: Number(queryResult.rows[0]?.value) || 0,
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

      // Get total count
      const countResult = await adapter.query(
        `SELECT COUNT(*) as count FROM ${adapter.escapeIdentifier(safeTable)}`,
        []
      );
      const total = parseInt(countResult.rows[0]?.count || '0', 10);

      // Get data
      const dataResult = await adapter.query(
        `SELECT * FROM ${adapter.escapeIdentifier(safeTable)} LIMIT ${adapter.buildParameterPlaceholder(1)} OFFSET ${adapter.buildParameterPlaceholder(2)}`,
        [limit, offset]
      );

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
    console.error('Error executing widget query:', error);
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
