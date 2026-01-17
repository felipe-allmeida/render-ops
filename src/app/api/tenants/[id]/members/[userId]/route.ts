import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import { z } from 'zod';
import { getMembership } from '@/lib/tenant';
import { canManageMembers, getAssignableRoles } from '@/lib/permissions';
import { TenantRole } from '@prisma/client';

interface RouteParams {
  params: Promise<{ id: string; userId: string }>;
}

const updateRoleSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']),
});

// PATCH /api/tenants/[id]/members/[userId] - Update member role
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: tenantId, userId: targetUserId } = await params;

    // Check if user can manage members
    const membership = await getMembership(session.user.id, tenantId);
    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this tenant' }, { status: 403 });
    }

    if (!canManageMembers(membership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions to manage members' }, { status: 403 });
    }

    // Get target membership
    const targetMembership = await prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId, userId: targetUserId } },
    });

    if (!targetMembership) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const body = await request.json();
    const validation = updateRoleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { role: newRole } = validation.data;

    // Special handling for OWNER role
    if (newRole === 'OWNER') {
      // Only current OWNER can transfer ownership
      if (membership.role !== 'OWNER') {
        return NextResponse.json({ error: 'Only the owner can transfer ownership' }, { status: 403 });
      }

      // Transfer ownership in a transaction
      await prisma.$transaction([
        // Demote current owner to ADMIN
        prisma.tenantMembership.update({
          where: { tenantId_userId: { tenantId, userId: session.user.id } },
          data: { role: 'ADMIN' },
        }),
        // Promote target to OWNER
        prisma.tenantMembership.update({
          where: { tenantId_userId: { tenantId, userId: targetUserId } },
          data: { role: 'OWNER' },
        }),
      ]);

      return NextResponse.json({ success: true, message: 'Ownership transferred' });
    }

    // Check if the role can be assigned by this user
    const assignableRoles = getAssignableRoles(membership.role);
    if (!assignableRoles.includes(newRole as TenantRole)) {
      return NextResponse.json(
        { error: `You cannot assign the role ${newRole}` },
        { status: 403 }
      );
    }

    // Can't demote another OWNER (unless transferring ownership above)
    if (targetMembership.role === 'OWNER') {
      return NextResponse.json({ error: 'Cannot change the owner\'s role' }, { status: 403 });
    }

    // ADMIN can't change other ADMIN's roles
    if (membership.role === 'ADMIN' && targetMembership.role === 'ADMIN') {
      return NextResponse.json({ error: 'Admins cannot change other admin\'s roles' }, { status: 403 });
    }

    // Update the role
    const updated = await prisma.tenantMembership.update({
      where: { tenantId_userId: { tenantId, userId: targetUserId } },
      data: { role: newRole as TenantRole },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating member role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/tenants/[id]/members/[userId] - Remove member
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: tenantId, userId: targetUserId } = await params;

    // Check if user can manage members
    const membership = await getMembership(session.user.id, tenantId);
    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this tenant' }, { status: 403 });
    }

    // Allow users to leave on their own (unless they're the owner)
    const isLeavingOwn = session.user.id === targetUserId;

    if (!isLeavingOwn && !canManageMembers(membership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions to remove members' }, { status: 403 });
    }

    // Get target membership
    const targetMembership = await prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId, userId: targetUserId } },
    });

    if (!targetMembership) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Cannot remove the owner
    if (targetMembership.role === 'OWNER') {
      return NextResponse.json(
        { error: 'Cannot remove the owner. Transfer ownership first.' },
        { status: 403 }
      );
    }

    // ADMIN can't remove other ADMINs
    if (membership.role === 'ADMIN' && targetMembership.role === 'ADMIN' && !isLeavingOwn) {
      return NextResponse.json({ error: 'Admins cannot remove other admins' }, { status: 403 });
    }

    // Remove the member
    await prisma.tenantMembership.delete({
      where: { tenantId_userId: { tenantId, userId: targetUserId } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
