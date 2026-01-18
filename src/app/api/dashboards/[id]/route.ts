import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import { z } from 'zod';
import { ensureTenant, requireTenantPermission } from '@/lib/tenant';

// Filter schemas
const filterOperatorSchema = z.enum([
  'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
  'contains', 'starts_with', 'ends_with',
  'in', 'not_in', 'is_null', 'is_not_null'
]);

const widgetFilterSchema = z.object({
  id: z.string(),
  column: z.string(),
  operator: filterOperatorSchema,
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
    z.array(z.number()),
    z.null()
  ]).optional(),
});

const filterGroupSchema = z.object({
  logic: z.enum(['AND', 'OR']),
  filters: z.array(widgetFilterSchema),
});

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
      datePeriod: z.enum(['day', 'week', 'month', 'year']).optional(),
      chartType: z.enum(['bar', 'line', 'pie', 'area']).optional(),
      xAxis: z.string().optional(),
      yAxis: z.string().optional(),
      content: z.string().optional(),
      filters: filterGroupSchema.optional(),
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

    // Get user's tenant
    const tenant = await ensureTenant(session.user.id, session.user.name);

    // Check read permission
    const permission = await requireTenantPermission(session.user.id, tenant.tenantId, 'read');
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.error }, { status: 403 });
    }

    const dashboard = await prisma.dashboard.findFirst({
      where: {
        id,
        tenantId: tenant.tenantId,
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
      createdBy: dashboard.createdBy,
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

    // Get user's tenant
    const tenant = await ensureTenant(session.user.id, session.user.name);

    // Check update permission
    const permission = await requireTenantPermission(session.user.id, tenant.tenantId, 'update');
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.error }, { status: 403 });
    }

    // Check if dashboard exists and belongs to tenant
    const existingDashboard = await prisma.dashboard.findFirst({
      where: {
        id,
        tenantId: tenant.tenantId,
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

    // Verify tenant has access to all specified connections
    if (connectionIds && connectionIds.length > 0) {
      const tenantConnections = await prisma.connection.findMany({
        where: {
          id: { in: connectionIds },
          tenantId: tenant.tenantId,
        },
        select: { id: true },
      });

      const validConnectionIds = tenantConnections.map((c) => c.id);
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

    // Get user's tenant
    const tenant = await ensureTenant(session.user.id, session.user.name);

    // Check delete permission
    const permission = await requireTenantPermission(session.user.id, tenant.tenantId, 'delete');
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.error }, { status: 403 });
    }

    // Check if dashboard exists and belongs to tenant
    const dashboard = await prisma.dashboard.findFirst({
      where: {
        id,
        tenantId: tenant.tenantId,
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
