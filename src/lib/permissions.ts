import { TenantRole } from '@prisma/client';

export type Permission = 'read' | 'create' | 'update' | 'delete';

const ROLE_PERMISSIONS: Record<TenantRole, Permission[]> = {
  OWNER: ['read', 'create', 'update', 'delete'],
  ADMIN: ['read', 'create', 'update', 'delete'],
  MEMBER: ['read', 'create', 'update', 'delete'],
  VIEWER: ['read'],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: TenantRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Get all permissions for a role
 */
export function getPermissions(role: TenantRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Check if an action is restricted to owners only
 */
export function isOwnerOnly(action: string): boolean {
  return ['delete_tenant', 'transfer_ownership'].includes(action);
}

/**
 * Check if a role can manage members (add/remove/change roles)
 */
export function canManageMembers(role: TenantRole): boolean {
  return role === 'OWNER' || role === 'ADMIN';
}

/**
 * Check if a role can manage tenant settings
 */
export function canManageTenant(role: TenantRole): boolean {
  return role === 'OWNER' || role === 'ADMIN';
}

/**
 * Get roles that a given role can assign to others
 * - OWNER can assign any role except OWNER (transfer ownership is separate)
 * - ADMIN can assign MEMBER and VIEWER
 */
export function getAssignableRoles(role: TenantRole): TenantRole[] {
  switch (role) {
    case 'OWNER':
      return ['ADMIN', 'MEMBER', 'VIEWER'];
    case 'ADMIN':
      return ['MEMBER', 'VIEWER'];
    default:
      return [];
  }
}
