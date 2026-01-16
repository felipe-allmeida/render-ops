import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import { query, mapPgTypeToFieldType } from '@/lib/pg-client';
import { generateCrudUI } from '@/lib/ui-generator';
import { z } from 'zod';

const generateUISchema = z.object({
  connectionId: z.string(),
  table: z.string(),
  type: z.enum(['crud', 'list']).default('crud'),
  readonly: z.boolean().optional().default(false),
});

interface ColumnInfo {
  column_name: string;
  data_type: string;
  udt_name: string;
  is_nullable: string;
  column_default: string | null;
  character_maximum_length: number | null;
}

interface ConstraintInfo {
  constraint_type: string;
  column_name: string;
}

// POST /api/ui/generate - Generate UI JSON for a table
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = generateUISchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { connectionId, table, readonly } = validation.data;

    // Get the connection
    const connection = await prisma.connection.findFirst({
      where: {
        id: connectionId,
        userId: session.user.id,
      },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Validate table name
    const tableNameRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    if (!tableNameRegex.test(table)) {
      return NextResponse.json({ error: 'Invalid table name' }, { status: 400 });
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
        character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
      `,
      [table]
    );

    if (columns.length === 0) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    // Get primary key constraints
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

    // Build schema
    const schema = {
      table,
      columns: columns.map((col) => ({
        name: col.column_name,
        type: col.data_type,
        udtType: col.udt_name,
        fieldType: mapPgTypeToFieldType(col.udt_name),
        nullable: col.is_nullable === 'YES',
        hasDefault: col.column_default !== null,
        isPrimaryKey: primaryKeyColumns.includes(col.column_name),
        isUnique: uniqueColumns.includes(col.column_name),
        maxLength: col.character_maximum_length,
      })),
      primaryKey: primaryKeyColumns,
    };

    // Generate UI
    const ui = generateCrudUI(schema, connectionId, { readonly });

    return NextResponse.json({ ui, schema });
  } catch (error) {
    console.error('Error generating UI:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
