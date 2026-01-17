import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import { getAdapter } from '@/lib/database';
import { ensureTenant, requireTenantPermission } from '@/lib/tenant';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/connections/:id/tables - List tables in the connected database
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
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Get adapter and list tables
    const adapter = getAdapter(connection.connectionString);
    const tables = await adapter.listTables();

    // Filter out system/internal tables
    // Auth tables - always hidden
    const authTables = [
      'user',                 // NextAuth: users
      'account',              // NextAuth: OAuth accounts
      'session',              // NextAuth: sessions
      'verification_token',   // NextAuth: email verification
      'verificationtoken',    // NextAuth: email verification (Prisma variation)
      'authenticator',        // NextAuth: WebAuthn
    ];

    // Migration/system tables
    const systemTables = [
      '_prisma_migrations',
      'schema_migrations',
      'knex_migrations',
      'knex_migrations_lock',
      'typeorm_metadata',
      'ar_internal_metadata',
      'flyway_schema_history',
    ];

    const filteredTables = tables
      .filter((t) => {
        const name = t.name.toLowerCase();
        // Skip auth tables (always hidden)
        if (authTables.includes(name)) return false;
        // Skip migration/system tables
        if (systemTables.includes(name)) return false;
        // Skip tables starting with underscore (internal)
        if (name.startsWith('_')) return false;
        // Skip common ORM internal tables
        if (name.startsWith('prisma_')) return false;
        if (name.startsWith('pg_')) return false;
        return true;
      });

    return NextResponse.json({ tables: filteredTables });
  } catch (error) {
    console.error('Error fetching tables:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
