import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import { query } from '@/lib/pg-client';

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

    // Get connection
    const connection = await prisma.connection.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Validate table name to prevent SQL injection
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
      return NextResponse.json({ error: 'Invalid table name' }, { status: 400 });
    }

    // Get column information
    const columns = await query<{
      column_name: string;
      data_type: string;
      is_nullable: string;
      column_default: string | null;
    }>(
      connection.connectionString,
      `
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_name = $1
          AND table_schema = 'public'
        ORDER BY ordinal_position
      `,
      [table]
    );

    return NextResponse.json({
      columns: columns.map((col) => ({
        name: col.column_name,
        type: col.data_type,
        nullable: col.is_nullable === 'YES',
        default: col.column_default,
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
