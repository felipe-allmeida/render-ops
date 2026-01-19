import { TenantRole } from '@prisma/client';
import prisma from '@/lib/db';
import { hasPermission, Permission } from '@/lib/permissions';

export interface TenantContext {
  tenantId: string;
  role: TenantRole;
}

/**
 * Get the tenant membership for a user
 * Returns the first tenant the user belongs to (MVP: 1 tenant per user)
 */
export async function getTenantForUser(userId: string): Promise<TenantContext | null> {
  const membership = await prisma.tenantMembership.findFirst({
    where: { userId },
    select: {
      tenantId: true,
      role: true,
    },
  });

  if (!membership) {
    return null;
  }

  return {
    tenantId: membership.tenantId,
    role: membership.role,
  };
}

/**
 * Get membership for a specific tenant
 */
export async function getMembership(
  userId: string,
  tenantId: string
): Promise<TenantContext | null> {
  const membership = await prisma.tenantMembership.findUnique({
    where: {
      tenantId_userId: { tenantId, userId },
    },
    select: {
      tenantId: true,
      role: true,
    },
  });

  if (!membership) {
    return null;
  }

  return {
    tenantId: membership.tenantId,
    role: membership.role,
  };
}

/**
 * Ensure user has a tenant, creating one if needed (auto-provisioning)
 * Used during first login to create a personal tenant
 */
export async function ensureTenant(
  userId: string,
  userName?: string | null
): Promise<TenantContext> {
  // Check if user already has a tenant
  const existing = await getTenantForUser(userId);
  if (existing) {
    return existing;
  }

  // Create a new tenant for the user (with retry for race conditions)
  const slug = generateSlug(userName || userId);

  try {
    const tenant = await prisma.tenant.create({
      data: {
        name: userName ? `${userName}'s Workspace` : 'My Workspace',
        slug: await ensureUniqueSlug(slug),
        memberships: {
          create: {
            userId,
            role: 'OWNER',
          },
        },
      },
    });

    return {
      tenantId: tenant.id,
      role: 'OWNER',
    };
  } catch (error: unknown) {
    // Handle race condition - another request may have created the tenant
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      // Wait a bit and check again for the tenant
      await new Promise(resolve => setTimeout(resolve, 100));
      const retryExisting = await getTenantForUser(userId);
      if (retryExisting) {
        return retryExisting;
      }
      // If still no tenant, retry with a random suffix
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const tenant = await prisma.tenant.create({
        data: {
          name: userName ? `${userName}'s Workspace` : 'My Workspace',
          slug: `${slug}-${randomSuffix}`,
          memberships: {
            create: {
              userId,
              role: 'OWNER',
            },
          },
        },
      });
      return {
        tenantId: tenant.id,
        role: 'OWNER',
      };
    }
    throw error;
  }
}

/**
 * Check if user has permission in a tenant
 */
export async function requireTenantPermission(
  userId: string,
  tenantId: string,
  permission: Permission
): Promise<{ allowed: true; role: TenantRole } | { allowed: false; error: string }> {
  const membership = await getMembership(userId, tenantId);

  if (!membership) {
    return { allowed: false, error: 'Not a member of this tenant' };
  }

  if (!hasPermission(membership.role, permission)) {
    return { allowed: false, error: 'Insufficient permissions' };
  }

  return { allowed: true, role: membership.role };
}

/**
 * Generate a URL-friendly slug from a name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

/**
 * Ensure slug is unique by appending numbers if needed
 */
async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug || 'workspace';
  let counter = 0;

  while (true) {
    const existing = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing) {
      return slug;
    }

    counter++;
    slug = `${baseSlug}-${counter}`;
  }
}

/**
 * Get tenant details with member count
 */
export async function getTenantWithDetails(tenantId: string) {
  return prisma.tenant.findUnique({
    where: { id: tenantId },
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
}
