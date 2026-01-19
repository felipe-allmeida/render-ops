import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import { ensureTenant, requireTenantPermission } from '@/lib/tenant';

interface RouteParams {
  params: Promise<{ id: string; table: string }>;
}

export interface ColumnDictionary {
  columnName: string;
  label: string | null;
  description: string | null;
  formatType: string | null;
  enumMapping: Record<string, string> | null;
}

// GET /api/connections/:id/dictionary/:table - Get dictionary for a specific table
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id: connectionId, table: tableName } = await params;

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

    // Get entries for this table OR global entries (tableName = null)
    const entries = await prisma.dataDictionary.findMany({
      where: {
        connectionId,
        OR: [
          { tableName: tableName },
          { tableName: null },
        ],
      },
    });

    // Build a map: columnName -> dictionary entry
    // Table-specific entries override global ones
    const dictionaryMap = new Map<string, ColumnDictionary>();

    // First add global entries
    entries
      .filter((e) => e.tableName === null)
      .forEach((e) => {
        dictionaryMap.set(e.columnName, {
          columnName: e.columnName,
          label: e.label,
          description: e.description,
          formatType: e.formatType,
          enumMapping: e.enumMapping as Record<string, string> | null,
        });
      });

    // Then override with table-specific entries
    entries
      .filter((e) => e.tableName === tableName)
      .forEach((e) => {
        dictionaryMap.set(e.columnName, {
          columnName: e.columnName,
          label: e.label,
          description: e.description,
          formatType: e.formatType,
          enumMapping: e.enumMapping as Record<string, string> | null,
        });
      });

    // Convert to object for easier consumption
    const dictionary: Record<string, ColumnDictionary> = {};
    dictionaryMap.forEach((value, key) => {
      dictionary[key] = value;
    });

    return NextResponse.json({ dictionary });
  } catch (error) {
    console.error('Error fetching table dictionary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
