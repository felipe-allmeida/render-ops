import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import { z } from 'zod';
import { createAdapter, getDatabaseType, DatabaseType } from '@/lib/database';
import { ensureTenant, requireTenantPermission } from '@/lib/tenant';

// Support both connectionString OR individual fields
const createConnectionSchema = z.object({
  name: z.string().min(1).max(100),
  // Option 1: Direct connection string
  connectionString: z.string().min(1).optional(),
  // Option 2: Individual fields
  host: z.string().optional(),
  port: z.string().optional(),
  database: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  ssl: z.boolean().optional(),
  dbType: z.enum(['postgresql', 'mysql', 'mongodb', 'sqlserver']).optional(),
  // Access mode
  readonly: z.boolean().optional(),
}).refine(
  (data) => data.connectionString || (data.host && data.database && data.username),
  { message: 'Either connectionString or host/database/username are required' }
);

// Build connection string from individual fields
function buildConnectionString(data: {
  host?: string;
  port?: string;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  dbType?: string;
}): string {
  const { host, port, database, username, password, ssl, dbType = 'postgresql' } = data;

  const defaultPorts: Record<string, string> = {
    postgresql: '5432',
    mysql: '3306',
    mongodb: '27017',
    sqlserver: '1433',
  };

  const actualPort = port || defaultPorts[dbType] || '5432';
  const encodedPassword = encodeURIComponent(password || '');

  switch (dbType) {
    case 'mysql':
      return `mysql://${username}:${encodedPassword}@${host}:${actualPort}/${database}`;
    case 'mongodb':
      return `mongodb://${username}:${encodedPassword}@${host}:${actualPort}/${database}`;
    case 'sqlserver':
      return `mssql://${username}:${encodedPassword}@${host}:${actualPort}/${database}`;
    case 'postgresql':
    default:
      const sslParam = ssl ? '?sslmode=require' : '';
      return `postgresql://${username}:${encodedPassword}@${host}:${actualPort}/${database}${sslParam}`;
  }
}

// GET /api/connections - List tenant's connections
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant (auto-create if needed)
    const tenant = await ensureTenant(session.user.id, session.user.name);

    // Check read permission
    const permission = await requireTenantPermission(session.user.id, tenant.tenantId, 'read');
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.error }, { status: 403 });
    }

    const connections = await prisma.connection.findMany({
      where: { tenantId: tenant.tenantId },
      select: {
        id: true,
        name: true,
        dbType: true,
        readonly: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(connections);
  } catch (error) {
    console.error('Error fetching connections:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/connections - Create a new connection
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant (auto-create if needed)
    const tenant = await ensureTenant(session.user.id, session.user.name);

    // Check create permission
    const permission = await requireTenantPermission(session.user.id, tenant.tenantId, 'create');
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.error }, { status: 403 });
    }

    const body = await request.json();
    const validation = createConnectionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { name, connectionString: directConnectionString, host, port, database, username, password, ssl, dbType, readonly } = validation.data;

    // Build connection string from fields if not provided directly
    const connectionString = directConnectionString || buildConnectionString({ host, port, database, username, password, ssl, dbType });

    // Detect database type from connection string
    const detectedDbType: DatabaseType = getDatabaseType(connectionString);

    // Test the connection before saving
    try {
      const adapter = createAdapter(connectionString);
      const result = await adapter.testConnection();
      await adapter.disconnect();

      if (!result.success) {
        return NextResponse.json(
          {
            error: 'Failed to connect to database',
            details: result.error || 'Unknown error',
          },
          { status: 400 }
        );
      }
    } catch (dbError) {
      return NextResponse.json(
        {
          error: 'Failed to connect to database',
          details: dbError instanceof Error ? dbError.message : 'Unknown error',
        },
        { status: 400 }
      );
    }

    const connection = await prisma.connection.create({
      data: {
        name,
        connectionString,
        dbType: detectedDbType,
        tenantId: tenant.tenantId,
        createdBy: session.user.id,
        readonly: readonly ?? false,
      },
      select: {
        id: true,
        name: true,
        dbType: true,
        readonly: true,
        createdBy: true,
        createdAt: true,
      },
    });

    return NextResponse.json(connection, { status: 201 });
  } catch (error) {
    console.error('Error creating connection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
