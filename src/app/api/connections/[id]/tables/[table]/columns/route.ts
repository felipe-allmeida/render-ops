import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import { getAdapter } from '@/lib/database';
import { ensureTenant, requireTenantPermission } from '@/lib/tenant';

interface RouteParams {
  params: Promise<{ id: string; table: string }>;
}

// GET /api/connections/[id]/tables/[table]/columns - Get columns for a table
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, table } = await params;

    // Get user's tenant
    const tenant = await ensureTenant(session.user.id, session.user.name);

    // Check read permission
    const permission = await requireTenantPermission(session.user.id, tenant.tenantId, 'read');
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.error }, { status: 403 });
    }

    // Get connection
    const connection = await prisma.connection.findFirst({
      where: {
        id,
        tenantId: tenant.tenantId,
      },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Validate table name to prevent injection
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
      return NextResponse.json({ error: 'Invalid table name' }, { status: 400 });
    }

    // Get adapter and table schema
    const adapter = getAdapter(connection.connectionString);
    const schema = await adapter.getTableSchema(table);

    return NextResponse.json({
      columns: schema.columns.map((col) => ({
        name: col.name,
        type: col.type,
        fieldType: col.fieldType,
        nullable: col.nullable,
        default: col.defaultValue !== undefined,
      })),
    });
  } catch (error) {
    console.error('Error fetching columns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch columns' },
      { status: 500 }
    );
  }
}
