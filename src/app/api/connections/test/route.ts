import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPool } from '@/lib/pg-client';
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
}): string {
  const { host, port = '5432', database, username, password, ssl } = data;
  const sslParam = ssl ? '?sslmode=require' : '';
  return `postgresql://${username}:${encodeURIComponent(password || '')}@${host}:${port}/${database}${sslParam}`;
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

    const { connectionString: directConnectionString, host, port, database, username, password, ssl } = validation.data;

    // Build connection string from fields if not provided directly
    const connectionString = directConnectionString || buildConnectionString({ host, port, database, username, password, ssl });

    // Test the connection
    const startTime = Date.now();
    try {
      const pool = getPool(connectionString);
      const client = await pool.connect();

      // Get some basic info about the database
      const versionResult = await client.query('SELECT version()');
      const version = versionResult.rows[0]?.version || 'Unknown';

      // Get table count
      const tableCountResult = await client.query(`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      `);
      const tableCount = parseInt(tableCountResult.rows[0]?.count || '0', 10);

      client.release();

      const responseTime = Date.now() - startTime;

      return NextResponse.json({
        success: true,
        message: 'Connection successful',
        details: {
          version: version.split(',')[0], // Just the version part
          tableCount,
          responseTime: `${responseTime}ms`,
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
