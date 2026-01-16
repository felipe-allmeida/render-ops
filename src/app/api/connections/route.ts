import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import { z } from 'zod';
import { getPool } from '@/lib/pg-client';

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
  dbType: z.string().optional(),
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
}): string {
  const { host, port = '5432', database, username, password, ssl } = data;
  const sslParam = ssl ? '?sslmode=require' : '';
  return `postgresql://${username}:${encodeURIComponent(password || '')}@${host}:${port}/${database}${sslParam}`;
}

// GET /api/connections - List user's connections
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connections = await prisma.connection.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        name: true,
        readonly: true,
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

    const body = await request.json();
    const validation = createConnectionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { name, connectionString: directConnectionString, host, port, database, username, password, ssl, readonly } = validation.data;

    // Build connection string from fields if not provided directly
    const connectionString = directConnectionString || buildConnectionString({ host, port, database, username, password, ssl });

    // Test the connection before saving
    try {
      const pool = getPool(connectionString);
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
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
        userId: session.user.id,
        readonly: readonly ?? false,
      },
      select: {
        id: true,
        name: true,
        readonly: true,
        createdAt: true,
      },
    });

    return NextResponse.json(connection, { status: 201 });
  } catch (error) {
    console.error('Error creating connection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
