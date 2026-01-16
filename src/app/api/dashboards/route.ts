import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import { z } from 'zod';

// Schema for creating a dashboard
const createDashboardSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  layout: z.object({
    columns: z.number().default(12),
    rowHeight: z.number().default(80),
  }).optional(),
  widgets: z.array(z.object({
    id: z.string(),
    type: z.enum(['kpi', 'chart', 'table', 'text']),
    title: z.string(),
    x: z.number().min(0).max(11),
    y: z.number().min(0),
    width: z.number().min(1).max(12),
    height: z.number().min(1),
    config: z.object({
      connectionId: z.string().optional(),
      query: z.string().optional(),
      table: z.string().optional(),
      aggregation: z.enum(['count', 'sum', 'avg', 'min', 'max']).optional(),
      field: z.string().optional(),
      groupBy: z.string().optional(),
      chartType: z.enum(['bar', 'line', 'pie', 'area']).optional(),
      xAxis: z.string().optional(),
      yAxis: z.string().optional(),
      content: z.string().optional(), // For text widgets
    }).optional(),
  })).optional(),
  connectionIds: z.array(z.string()).optional(),
});

// GET /api/dashboards - List user's dashboards
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dashboards = await prisma.dashboard.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        connections: {
          select: {
            connectionId: true,
          },
        },
      },
    });

    // Transform to include connectionIds array
    const result = dashboards.map((dashboard) => ({
      id: dashboard.id,
      name: dashboard.name,
      description: dashboard.description,
      layout: dashboard.layout,
      widgets: dashboard.widgets,
      connectionIds: dashboard.connections.map((c) => c.connectionId),
      createdAt: dashboard.createdAt,
      updatedAt: dashboard.updatedAt,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching dashboards:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/dashboards - Create a new dashboard
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = createDashboardSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { name, description, layout, widgets, connectionIds } = validation.data;

    // Verify user has access to all specified connections
    if (connectionIds && connectionIds.length > 0) {
      const userConnections = await prisma.connection.findMany({
        where: {
          id: { in: connectionIds },
          userId: session.user.id,
        },
        select: { id: true },
      });

      const validConnectionIds = userConnections.map((c) => c.id);
      const invalidIds = connectionIds.filter((id) => !validConnectionIds.includes(id));

      if (invalidIds.length > 0) {
        return NextResponse.json(
          { error: 'Invalid connection IDs', invalidIds },
          { status: 400 }
        );
      }
    }

    // Create dashboard with connections
    const dashboard = await prisma.dashboard.create({
      data: {
        name,
        description,
        userId: session.user.id,
        layout: layout || { columns: 12, rowHeight: 80 },
        widgets: widgets || [],
        connections: connectionIds
          ? {
              create: connectionIds.map((connectionId) => ({
                connectionId,
              })),
            }
          : undefined,
      },
      include: {
        connections: {
          select: { connectionId: true },
        },
      },
    });

    return NextResponse.json({
      id: dashboard.id,
      name: dashboard.name,
      description: dashboard.description,
      layout: dashboard.layout,
      widgets: dashboard.widgets,
      connectionIds: dashboard.connections.map((c) => c.connectionId),
      createdAt: dashboard.createdAt,
      updatedAt: dashboard.updatedAt,
    });
  } catch (error) {
    console.error('Error creating dashboard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
