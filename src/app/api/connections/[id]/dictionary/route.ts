import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import { ensureTenant, requireTenantPermission } from '@/lib/tenant';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Schema for creating/updating dictionary entry
const dictionaryEntrySchema = z.object({
  tableName: z.string().nullable().optional(),
  columnName: z.string().min(1),
  label: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  formatType: z.enum([
    'text', 'number', 'currency', 'percent', 'date', 'datetime', 'time',
    'phone', 'email', 'url', 'boolean'
  ]).nullable().optional(),
  enumMapping: z.record(z.string()).nullable().optional(),
});

// GET /api/connections/:id/dictionary - List all dictionary entries
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id: connectionId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenant = await ensureTenant(session.user.id, session.user.name);
    const permission = await requireTenantPermission(session.user.id, tenant.tenantId, 'read');
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.error }, { status: 403 });
    }

    // Verify connection belongs to tenant
    const connection = await prisma.connection.findFirst({
      where: { id: connectionId, tenantId: tenant.tenantId },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    const entries = await prisma.dataDictionary.findMany({
      where: { connectionId },
      orderBy: [{ tableName: 'asc' }, { columnName: 'asc' }],
    });

    return NextResponse.json({ entries });
  } catch (error) {
    console.error('Error fetching dictionary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/connections/:id/dictionary - Create or update dictionary entry
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id: connectionId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenant = await ensureTenant(session.user.id, session.user.name);
    const permission = await requireTenantPermission(session.user.id, tenant.tenantId, 'update');
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.error }, { status: 403 });
    }

    // Verify connection belongs to tenant
    const connection = await prisma.connection.findFirst({
      where: { id: connectionId, tenantId: tenant.tenantId },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    const body = await request.json();
    const validation = dictionaryEntrySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { tableName, columnName, label, description, formatType, enumMapping } = validation.data;

    // Upsert - create or update
    const entry = await prisma.dataDictionary.upsert({
      where: {
        connectionId_tableName_columnName: {
          connectionId,
          tableName: tableName || null,
          columnName,
        },
      },
      update: {
        label,
        description,
        formatType,
        enumMapping: enumMapping || undefined,
      },
      create: {
        connectionId,
        tableName: tableName || null,
        columnName,
        label,
        description,
        formatType,
        enumMapping: enumMapping || undefined,
      },
    });

    return NextResponse.json({ entry });
  } catch (error) {
    console.error('Error saving dictionary entry:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/connections/:id/dictionary - Delete dictionary entry
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id: connectionId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenant = await ensureTenant(session.user.id, session.user.name);
    const permission = await requireTenantPermission(session.user.id, tenant.tenantId, 'delete');
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.error }, { status: 403 });
    }

    // Get entry ID from query params
    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get('entryId');

    if (!entryId) {
      return NextResponse.json({ error: 'Entry ID required' }, { status: 400 });
    }

    // Verify entry belongs to this connection and tenant
    const entry = await prisma.dataDictionary.findFirst({
      where: {
        id: entryId,
        connectionId,
        connection: { tenantId: tenant.tenantId },
      },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    await prisma.dataDictionary.delete({
      where: { id: entryId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting dictionary entry:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
