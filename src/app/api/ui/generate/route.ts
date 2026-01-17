import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import { getAdapter } from '@/lib/database';
import { generateCrudUI } from '@/lib/ui-generator';
import { z } from 'zod';
import { ensureTenant } from '@/lib/tenant';

const generateUISchema = z.object({
  connectionId: z.string(),
  table: z.string(),
  type: z.enum(['crud', 'list']).default('crud'),
  readonly: z.boolean().optional().default(false),
});

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

    // Get user's tenant
    const tenant = await ensureTenant(session.user.id, session.user.name);

    // Get the connection
    const connection = await prisma.connection.findFirst({
      where: {
        id: connectionId,
        tenantId: tenant.tenantId,
      },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Validate table name (allow dots for schema.table notation)
    const tableNameRegex = /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)?$/;
    if (!tableNameRegex.test(table)) {
      return NextResponse.json({ error: 'Invalid table name' }, { status: 400 });
    }

    // Get adapter for the database type
    const adapter = getAdapter(connection.connectionString);

    // Get table schema using the adapter
    const tableSchema = await adapter.getTableSchema(table);

    if (tableSchema.columns.length === 0) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    // Build schema in the format expected by generateCrudUI
    const schema = {
      table: tableSchema.name,
      columns: tableSchema.columns.map((col) => ({
        name: col.name,
        type: col.type,
        udtType: col.type, // Use native type as udtType
        fieldType: col.fieldType,
        nullable: col.nullable,
        hasDefault: col.defaultValue != null, // Check for both null and undefined
        isPrimaryKey: col.isPrimaryKey,
        isUnique: col.isPrimaryKey, // Treat primary keys as unique
        maxLength: col.maxLength,
      })),
      primaryKey: tableSchema.primaryKey,
    };

    // Generate UI
    const ui = generateCrudUI(schema, connectionId, { readonly });

    return NextResponse.json({ ui, schema });
  } catch (error) {
    console.error('Error generating UI:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
