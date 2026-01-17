import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import { z } from 'zod';
import { getMembership } from '@/lib/tenant';
import { canManageMembers, getAssignableRoles } from '@/lib/permissions';
import { TenantRole } from '@prisma/client';
import {
  findUserByEmail,
  createUser,
  getUserById,
  formatUserForResponse,
} from '@/lib/keycloak-admin';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/tenants/[id]/members - List tenant members
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: tenantId } = await params;

    // Check if user is a member of this tenant
    const membership = await getMembership(session.user.id, tenantId);
    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this tenant' }, { status: 403 });
    }

    // Get all members
    const members = await prisma.tenantMembership.findMany({
      where: { tenantId },
      orderBy: [
        { role: 'asc' }, // OWNER first
        { createdAt: 'asc' },
      ],
    });

    // Enrich members with Keycloak user info
    const enrichedMembers = await Promise.all(
      members.map(async (member) => {
        try {
          const keycloakUser = await getUserById(member.userId);
          return {
            ...member,
            user: keycloakUser ? formatUserForResponse(keycloakUser) : null,
          };
        } catch {
          // If Keycloak lookup fails, return member without user info
          return { ...member, user: null };
        }
      })
    );

    return NextResponse.json(enrichedMembers);
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const addMemberSchema = z.object({
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  password: z.string().min(8).optional(), // Optional: if not provided, user must set on first login
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']), // Can't add as OWNER
});

// POST /api/tenants/[id]/members - Add a new member (by email)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: tenantId } = await params;

    // Check if user can manage members
    const membership = await getMembership(session.user.id, tenantId);
    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this tenant' }, { status: 403 });
    }

    if (!canManageMembers(membership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions to manage members' }, { status: 403 });
    }

    const body = await request.json();
    const validation = addMemberSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { email, firstName, lastName, password, role } = validation.data;

    // Check if the role can be assigned by this user
    const assignableRoles = getAssignableRoles(membership.role);
    if (!assignableRoles.includes(role as TenantRole)) {
      return NextResponse.json(
        { error: `You cannot assign the role ${role}` },
        { status: 403 }
      );
    }

    // Find or create user in Keycloak
    let keycloakUser = await findUserByEmail(email);
    let isNewUser = false;

    if (!keycloakUser) {
      // Create user in Keycloak
      try {
        keycloakUser = await createUser({
          email,
          firstName,
          lastName,
          password,
        });
        isNewUser = true;
      } catch (error) {
        console.error('Error creating user in Keycloak:', error);
        return NextResponse.json(
          { error: error instanceof Error ? error.message : 'Failed to create user' },
          { status: 500 }
        );
      }
    }

    const userId = keycloakUser.id;

    // Check if user is already a member
    const existingMembership = await prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: 'User is already a member of this workspace' },
        { status: 409 }
      );
    }

    // Add the new member
    const newMembership = await prisma.tenantMembership.create({
      data: {
        tenantId,
        userId,
        role: role as TenantRole,
      },
    });

    return NextResponse.json(
      {
        ...newMembership,
        user: formatUserForResponse(keycloakUser),
        isNewUser,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error adding member:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
