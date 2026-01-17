import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import { z } from 'zod';
import { getTenantForUser } from '@/lib/tenant';

const createTenantSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  }),
});

// GET /api/tenants - List tenants user belongs to
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const memberships = await prisma.tenantMembership.findMany({
      where: { userId: session.user.id },
      include: {
        tenant: {
          include: {
            _count: {
              select: {
                memberships: true,
                connections: true,
                dashboards: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const tenants = memberships.map((m) => ({
      id: m.tenant.id,
      name: m.tenant.name,
      slug: m.tenant.slug,
      role: m.role,
      memberCount: m.tenant._count.memberships,
      connectionCount: m.tenant._count.connections,
      dashboardCount: m.tenant._count.dashboards,
      createdAt: m.tenant.createdAt,
    }));

    return NextResponse.json(tenants);
  } catch (error) {
    console.error('Error fetching tenants:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/tenants - Create a new tenant
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = createTenantSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { name, slug } = validation.data;

    // Check if slug is already taken
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existingTenant) {
      return NextResponse.json(
        { error: 'Slug already in use' },
        { status: 409 }
      );
    }

    // MVP: Only allow one tenant per user
    const existingMembership = await getTenantForUser(session.user.id);
    if (existingMembership) {
      return NextResponse.json(
        { error: 'You already belong to a tenant. Multi-tenant support coming soon.' },
        { status: 400 }
      );
    }

    // Create tenant with user as owner
    const tenant = await prisma.tenant.create({
      data: {
        name,
        slug,
        memberships: {
          create: {
            userId: session.user.id,
            role: 'OWNER',
          },
        },
      },
      include: {
        _count: {
          select: {
            memberships: true,
          },
        },
      },
    });

    return NextResponse.json({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      role: 'OWNER',
      memberCount: tenant._count.memberships,
      createdAt: tenant.createdAt,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating tenant:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
