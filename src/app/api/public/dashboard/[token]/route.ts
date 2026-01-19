import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

interface RouteParams {
  params: Promise<{ token: string }>;
}

// GET /api/public/dashboard/:token - Get public dashboard by share token
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const dashboard = await prisma.dashboard.findUnique({
      where: { shareToken: token },
      select: {
        id: true,
        name: true,
        description: true,
        layout: true,
        widgets: true,
        isPublic: true,
        shareExpiresAt: true,
        tenant: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    // Check if sharing is enabled
    if (!dashboard.isPublic) {
      return NextResponse.json({ error: 'Dashboard is not public' }, { status: 403 });
    }

    // Check if share link has expired
    if (dashboard.shareExpiresAt && new Date() > dashboard.shareExpiresAt) {
      return NextResponse.json({ error: 'Share link has expired' }, { status: 410 });
    }

    return NextResponse.json({
      id: dashboard.id,
      name: dashboard.name,
      description: dashboard.description,
      layout: dashboard.layout,
      widgets: dashboard.widgets,
      tenantName: dashboard.tenant.name,
    });
  } catch (error) {
    console.error('Error fetching public dashboard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
