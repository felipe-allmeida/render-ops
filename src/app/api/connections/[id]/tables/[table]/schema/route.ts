import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import { query, mapPgTypeToFieldType } from '@/lib/pg-client';

interface RouteParams {
  params: Promise<{ id: string; table: string }>;
}

interface ColumnInfo {
  column_name: string;
  data_type: string;
  udt_name: string;
  is_nullable: string;
  column_default: string | null;
  character_maximum_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
}

interface ConstraintInfo {
  constraint_type: string;
  column_name: string;
}

// GET /api/connections/:id/tables/:table/schema - Get table schema
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id, table } = await params;

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

    // Validate table name (prevent SQL injection)
    const tableNameRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    if (!tableNameRegex.test(table)) {
      return NextResponse.json({ error: 'Invalid table name' }, { status: 400 });
    }

    // Check if table exists
    const tableExists = await query<{ exists: boolean }>(
      connection.connectionString,
      `
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = $1
      ) as exists
      `,
      [table]
    );

    if (!tableExists[0]?.exists) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    // Get column information
    const columns = await query<ColumnInfo>(
      connection.connectionString,
      `
      SELECT
        column_name,
        data_type,
        udt_name,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
      `,
      [table]
    );

    // Get primary key and unique constraints
    const constraints = await query<ConstraintInfo>(
      connection.connectionString,
      `
      SELECT
        tc.constraint_type,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name = $1
        AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
      `,
      [table]
    );

    const primaryKeyColumns = constraints
      .filter((c) => c.constraint_type === 'PRIMARY KEY')
      .map((c) => c.column_name);

    const uniqueColumns = constraints
      .filter((c) => c.constraint_type === 'UNIQUE')
      .map((c) => c.column_name);

    // Map columns to schema format
    const schema = columns.map((col) => ({
      name: col.column_name,
      type: col.data_type,
      udtType: col.udt_name,
      fieldType: mapPgTypeToFieldType(col.udt_name),
      nullable: col.is_nullable === 'YES',
      hasDefault: col.column_default !== null,
      isPrimaryKey: primaryKeyColumns.includes(col.column_name),
      isUnique: uniqueColumns.includes(col.column_name),
      maxLength: col.character_maximum_length,
      precision: col.numeric_precision,
      scale: col.numeric_scale,
    }));

    return NextResponse.json({
      table,
      columns: schema,
      primaryKey: primaryKeyColumns,
    });
  } catch (error) {
    console.error('Error fetching table schema:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
