import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import { query } from '@/lib/pg-client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface TableInfo {
  table_name: string;
  table_type: string;
}

// GET /api/connections/:id/tables - List tables in the connected database
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connection = await prisma.connection.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Query information_schema for tables
    const tables = await query<TableInfo>(
      connection.connectionString,
      `
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type IN ('BASE TABLE', 'VIEW')
      ORDER BY table_name
      `
    );

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
        const name = t.table_name.toLowerCase();
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
      })
      .map((t) => ({
        name: t.table_name,
        type: t.table_type === 'BASE TABLE' ? 'table' : 'view',
      }));

    return NextResponse.json({ tables: filteredTables });
  } catch (error) {
    console.error('Error fetching tables:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
