import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import { getAdapter } from '@/lib/database';
import { z } from 'zod';
import { ensureTenant, requireTenantPermission } from '@/lib/tenant';

const querySchema = z.object({
  sql: z.string().min(1),
  params: z.array(z.unknown()).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/connections/[id]/query - Execute a SQL query
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get user's tenant
    const tenant = await ensureTenant(session.user.id, session.user.name);

    // Check read permission (queries require at least read)
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

    const body = await request.json();
    const validation = querySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { sql, params: queryParams } = validation.data;

    // Execute query using adapter
    const adapter = getAdapter(connection.connectionString);
    const result = await adapter.query(sql, queryParams || []);

    return NextResponse.json({
      success: true,
      data: result.rows,
      rowCount: result.rowCount,
    });
  } catch (error) {
    console.error('Error executing query:', error);
    return NextResponse.json(
      {
        error: 'Query execution failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
