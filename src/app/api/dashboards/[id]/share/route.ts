import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import { ensureTenant, requireTenantPermission } from '@/lib/tenant';
import { randomBytes } from 'crypto';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Generate a secure random token
function generateShareToken(): string {
  return randomBytes(32).toString('base64url');
}

// GET /api/dashboards/:id/share - Get share status
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenant = await ensureTenant(session.user.id, session.user.name);
    const permission = await requireTenantPermission(session.user.id, tenant.tenantId, 'read');
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.error }, { status: 403 });
    }

    const dashboard = await prisma.dashboard.findFirst({
      where: { id, tenantId: tenant.tenantId },
      select: {
        id: true,
        isPublic: true,
        shareToken: true,
        shareExpiresAt: true,
      },
    });

    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    // Build share URL if public
    const shareUrl = dashboard.isPublic && dashboard.shareToken
      ? `${process.env.NEXTAUTH_URL || ''}/share/${dashboard.shareToken}`
      : null;

    return NextResponse.json({
      isPublic: dashboard.isPublic,
      shareToken: dashboard.shareToken,
      shareExpiresAt: dashboard.shareExpiresAt,
      shareUrl,
    });
  } catch (error) {
    console.error('Error getting share status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/dashboards/:id/share - Enable sharing / generate new token
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenant = await ensureTenant(session.user.id, session.user.name);
    const permission = await requireTenantPermission(session.user.id, tenant.tenantId, 'update');
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.error }, { status: 403 });
    }

    // Check dashboard exists and belongs to tenant
    const dashboard = await prisma.dashboard.findFirst({
      where: { id, tenantId: tenant.tenantId },
    });

    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    // Parse optional expiration from body
    let expiresAt: Date | null = null;
    try {
      const body = await request.json();
      if (body.expiresInDays && typeof body.expiresInDays === 'number') {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + body.expiresInDays);
      }
    } catch {
      // No body or invalid JSON - that's fine
    }

    // Generate new token and enable sharing
    const shareToken = generateShareToken();
    const updated = await prisma.dashboard.update({
      where: { id },
      data: {
        isPublic: true,
        shareToken,
        shareExpiresAt: expiresAt,
      },
      select: {
        id: true,
        isPublic: true,
        shareToken: true,
        shareExpiresAt: true,
      },
    });

    const shareUrl = `${process.env.NEXTAUTH_URL || ''}/share/${updated.shareToken}`;

    return NextResponse.json({
      isPublic: updated.isPublic,
      shareToken: updated.shareToken,
      shareExpiresAt: updated.shareExpiresAt,
      shareUrl,
    });
  } catch (error) {
    console.error('Error enabling share:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/dashboards/:id/share - Disable sharing
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenant = await ensureTenant(session.user.id, session.user.name);
    const permission = await requireTenantPermission(session.user.id, tenant.tenantId, 'update');
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.error }, { status: 403 });
    }

    // Check dashboard exists and belongs to tenant
    const dashboard = await prisma.dashboard.findFirst({
      where: { id, tenantId: tenant.tenantId },
    });

    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    // Disable sharing
    await prisma.dashboard.update({
      where: { id },
      data: {
        isPublic: false,
        shareToken: null,
        shareExpiresAt: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disabling share:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
