import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createAdapter, getDatabaseType } from '@/lib/database';
import { z } from 'zod';

// Support both connectionString OR individual fields
const testConnectionSchema = z.object({
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

// POST /api/connections/test - Test a database connection
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = testConnectionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { connectionString: directConnectionString, host, port, database, username, password, ssl, dbType } = validation.data;

    // Build connection string from fields if not provided directly
    const connectionString = directConnectionString || buildConnectionString({ host, port, database, username, password, ssl, dbType });

    // Test the connection
    const startTime = Date.now();
    try {
      const adapter = createAdapter(connectionString);
      const result = await adapter.testConnection();

      if (!result.success) {
        await adapter.disconnect();
        return NextResponse.json(
          {
            success: false,
            error: 'Connection failed',
            details: result.error || 'Unknown error',
          },
          { status: 400 }
        );
      }

      // Get table count
      const tables = await adapter.listTables();
      const tableCount = tables.length;

      await adapter.disconnect();

      const responseTime = Date.now() - startTime;
      const detectedType = getDatabaseType(connectionString);

      return NextResponse.json({
        success: true,
        message: 'Connection successful',
        details: {
          version: result.version || `${detectedType} database`,
          tableCount,
          responseTime: `${responseTime}ms`,
          dbType: detectedType,
        },
      });
    } catch (dbError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Connection failed',
          details: dbError instanceof Error ? dbError.message : 'Unknown error',
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error testing connection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
