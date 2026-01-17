import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import { closeAdapter } from '@/lib/database';
import { ensureTenant, requireTenantPermission } from '@/lib/tenant';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/connections/:id - Get a specific connection
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id } = await params;

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
      select: {
        id: true,
        name: true,
        dbType: true,
        readonly: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    return NextResponse.json(connection);
  } catch (error) {
    console.error('Error fetching connection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/connections/:id - Delete a connection
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant
    const tenant = await ensureTenant(session.user.id, session.user.name);

    // Check delete permission
    const permission = await requireTenantPermission(session.user.id, tenant.tenantId, 'delete');
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

    // Close the adapter connection
    await closeAdapter(connection.connectionString);

    // Delete the connection
    await prisma.connection.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting connection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
