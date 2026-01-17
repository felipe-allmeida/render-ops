import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { searchUsers, formatUserForResponse } from '@/lib/keycloak-admin';
import { getMembership } from '@/lib/tenant';
import { canManageMembers } from '@/lib/permissions';

// GET /api/users/search?q=query&tenantId=xxx - Search users in Keycloak
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const tenantId = searchParams.get('tenantId');

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      );
    }

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    // Check if user can manage members in this tenant
    const membership = await getMembership(session.user.id, tenantId);
    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this tenant' }, { status: 403 });
    }

    if (!canManageMembers(membership.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to search users' },
        { status: 403 }
      );
    }

    // Search users in Keycloak
    const users = await searchUsers(query, 10);

    // Format response
    const formattedUsers = users.map(formatUserForResponse);

    return NextResponse.json(formattedUsers);
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search users' },
      { status: 500 }
    );
  }
}
