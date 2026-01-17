import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import { ensureTenant } from '@/lib/tenant';

// GET /api/tenants/my - Get user's current tenant (auto-create if needed)
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure user has a tenant (auto-provision on first access)
    const context = await ensureTenant(session.user.id, session.user.name);

    // Fetch full tenant details
    const tenant = await prisma.tenant.findUnique({
      where: { id: context.tenantId },
      include: {
        _count: {
          select: {
            memberships: true,
            connections: true,
            dashboards: true,
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      role: context.role,
      memberCount: tenant._count.memberships,
      connectionCount: tenant._count.connections,
      dashboardCount: tenant._count.dashboards,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    });
  } catch (error) {
    console.error('Error fetching user tenant:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
