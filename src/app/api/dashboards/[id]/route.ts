import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import { z } from 'zod';

// Schema for updating a dashboard
const updateDashboardSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
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
      content: z.string().optional(),
    }).optional(),
  })).optional(),
  connectionIds: z.array(z.string()).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/dashboards/[id] - Get dashboard details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const dashboard = await prisma.dashboard.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        connections: {
          select: { connectionId: true },
        },
      },
    });

    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

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
    console.error('Error fetching dashboard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/dashboards/[id] - Update a dashboard
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if dashboard exists and belongs to user
    const existingDashboard = await prisma.dashboard.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingDashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    const body = await request.json();
    const validation = updateDashboardSchema.safeParse(body);

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
      const invalidIds = connectionIds.filter((cid) => !validConnectionIds.includes(cid));

      if (invalidIds.length > 0) {
        return NextResponse.json(
          { error: 'Invalid connection IDs', invalidIds },
          { status: 400 }
        );
      }
    }

    // Update dashboard
    const updatedDashboard = await prisma.$transaction(async (tx) => {
      // Update the dashboard
      const dashboard = await tx.dashboard.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(layout !== undefined && { layout }),
          ...(widgets !== undefined && { widgets }),
        },
      });

      // Update connections if provided
      if (connectionIds !== undefined) {
        // Delete existing connections
        await tx.dashboardConnection.deleteMany({
          where: { dashboardId: id },
        });

        // Create new connections
        if (connectionIds.length > 0) {
          await tx.dashboardConnection.createMany({
            data: connectionIds.map((connectionId) => ({
              dashboardId: id,
              connectionId,
            })),
          });
        }
      }

      // Fetch the updated dashboard with connections
      return tx.dashboard.findUnique({
        where: { id },
        include: {
          connections: {
            select: { connectionId: true },
          },
        },
      });
    });

    if (!updatedDashboard) {
      return NextResponse.json({ error: 'Failed to update dashboard' }, { status: 500 });
    }

    return NextResponse.json({
      id: updatedDashboard.id,
      name: updatedDashboard.name,
      description: updatedDashboard.description,
      layout: updatedDashboard.layout,
      widgets: updatedDashboard.widgets,
      connectionIds: updatedDashboard.connections.map((c) => c.connectionId),
      createdAt: updatedDashboard.createdAt,
      updatedAt: updatedDashboard.updatedAt,
    });
  } catch (error) {
    console.error('Error updating dashboard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/dashboards/[id] - Delete a dashboard
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if dashboard exists and belongs to user
    const dashboard = await prisma.dashboard.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    // Delete the dashboard (connections will cascade delete)
    await prisma.dashboard.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting dashboard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
