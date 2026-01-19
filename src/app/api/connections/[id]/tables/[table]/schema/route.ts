import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import { getAdapter } from '@/lib/database';
import { ensureTenant, requireTenantPermission } from '@/lib/tenant';

interface RouteParams {
  params: Promise<{ id: string; table: string }>;
}

// GET /api/connections/:id/tables/:table/schema - Get table schema
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id, table } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant
    const tenant = await ensureTenant(session.user.id, session.user.name);

    // Check read permission
    const permission = await requireTenantPermission(session.user.id, tenant.tenantId, 'read');
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.error }, { status: 403 });
    }

    const connection = await prisma.connection.findFirst({
      where: {
        id,
        tenantId: tenant.tenantId,
      },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Validate table name (prevent injection)
    const tableNameRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    if (!tableNameRegex.test(table)) {
      return NextResponse.json({ error: 'Invalid table name' }, { status: 400 });
    }

    // Get adapter and table schema
    const adapter = getAdapter(connection.connectionString);

    try {
      const schema = await adapter.getTableSchema(table);

      // Map to expected response format
      const columns = schema.columns.map((col) => ({
        name: col.name,
        type: col.type,
        udtType: col.type,
        fieldType: col.fieldType,
        nullable: col.nullable,
        hasDefault: col.defaultValue !== undefined,
        isPrimaryKey: col.isPrimaryKey,
        isAutoIncrement: col.isAutoIncrement,
        maxLength: col.maxLength,
        precision: col.precision,
        scale: col.scale,
      }));

      const primaryKey = columns
        .filter((c) => c.isPrimaryKey)
        .map((c) => c.name);

      return NextResponse.json({
        table: schema.name,
        columns,
        primaryKey,
      });
    } catch (schemaError) {
      // Table might not exist
      if (schemaError instanceof Error && schemaError.message.includes('not found')) {
        return NextResponse.json({ error: 'Table not found' }, { status: 404 });
      }
      throw schemaError;
    }
  } catch (error) {
    console.error('Error fetching table schema:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
