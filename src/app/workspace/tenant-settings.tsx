'use client';

import { useState, useEffect } from 'react';
import { TenantRole } from '@prisma/client';

interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  role: TenantRole;
  memberCount: number;
  connectionCount: number;
  dashboardCount: number;
  createdAt: string;
}

interface MemberUser {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
}

interface Member {
  id: string;
  tenantId: string;
  userId: string;
  role: TenantRole;
  createdAt: string;
  user: MemberUser | null;
}

interface TenantSettingsProps {
  currentUserId: string;
}

const ROLE_LABELS: Record<TenantRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Member',
  VIEWER: 'Viewer',
};

const ROLE_COLORS: Record<TenantRole, string> = {
  OWNER: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-blue-100 text-blue-700',
  MEMBER: 'bg-green-100 text-green-700',
  VIEWER: 'bg-gray-100 text-gray-700',
};

export function TenantSettings({ currentUserId }: TenantSettingsProps) {
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add member form
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberFirstName, setNewMemberFirstName] = useState('');
  const [newMemberLastName, setNewMemberLastName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [addMemberError, setAddMemberError] = useState<string | null>(null);
  const [addMemberSuccess, setAddMemberSuccess] = useState<string | null>(null);

  // Edit role
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<TenantRole>('MEMBER');

  const canManageMembers = tenant?.role === 'OWNER' || tenant?.role === 'ADMIN';

  useEffect(() => {
    fetchTenantAndMembers();
  }, []);

  const fetchTenantAndMembers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch tenant info
      const tenantRes = await fetch('/api/tenants/my');
      if (!tenantRes.ok) throw new Error('Failed to fetch tenant');
      const tenantData = await tenantRes.json();
      setTenant(tenantData);

      // Fetch members
      const membersRes = await fetch(`/api/tenants/${tenantData.id}/members`);
      if (!membersRes.ok) throw new Error('Failed to fetch members');
      const membersData = await membersRes.json();
      setMembers(membersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;

    setIsAddingMember(true);
    setAddMemberError(null);
    setAddMemberSuccess(null);

    try {
      const res = await fetch(`/api/tenants/${tenant.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newMemberEmail.trim().toLowerCase(),
          firstName: newMemberFirstName.trim() || undefined,
          lastName: newMemberLastName.trim() || undefined,
          role: newMemberRole,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to add member');
      }

      setMembers([...members, data]);

      // Show success message
      if (data.isNewUser) {
        setAddMemberSuccess(`User created and added! They will receive an email to set their password.`);
      } else {
        setAddMemberSuccess(`${data.user?.name || data.user?.email} added to the workspace.`);
      }

      // Reset form after short delay
      setTimeout(() => {
        setShowAddMember(false);
        setNewMemberEmail('');
        setNewMemberFirstName('');
        setNewMemberLastName('');
        setNewMemberRole('MEMBER');
        setAddMemberSuccess(null);
      }, 2000);
    } catch (err) {
      setAddMemberError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: TenantRole) => {
    if (!tenant) return;

    try {
      const res = await fetch(`/api/tenants/${tenant.id}/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update role');
      }

      // Refresh members list
      await fetchTenantAndMembers();
      setEditingMember(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!tenant) return;
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      const res = await fetch(`/api/tenants/${tenant.id}/members/${userId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove member');
      }

      setMembers(members.filter((m) => m.userId !== userId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="text-center py-12">
        <p className="text-danger-600">{error || 'Failed to load workspace settings'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Members */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Members</h2>
          {canManageMembers && (
            <button
              onClick={() => setShowAddMember(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Member
            </button>
          )}
        </div>

        {/* Add Member Form */}
        {showAddMember && (
          <form onSubmit={handleAddMember} className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Add New Member</h3>
            {addMemberError && (
              <div className="mb-3 p-2 bg-danger-50 border border-danger-200 text-danger-700 text-sm rounded">
                {addMemberError}
              </div>
            )}
            {addMemberSuccess && (
              <div className="mb-3 p-2 bg-success-50 border border-success-200 text-success-700 text-sm rounded">
                {addMemberSuccess}
              </div>
            )}
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-danger-500">*</span>
                </label>
                <input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  If the user doesn&apos;t exist, they will be created and receive an email to set their password.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={newMemberFirstName}
                    onChange={(e) => setNewMemberFirstName(e.target.value)}
                    placeholder="John"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={newMemberLastName}
                    onChange={(e) => setNewMemberLastName(e.target.value)}
                    placeholder="Doe"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role <span className="text-danger-500">*</span>
                </label>
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value as 'ADMIN' | 'MEMBER' | 'VIEWER')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                >
                  {tenant.role === 'OWNER' && <option value="ADMIN">Admin</option>}
                  <option value="MEMBER">Member</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddMember(false);
                  setAddMemberError(null);
                  setAddMemberSuccess(null);
                }}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isAddingMember || !!addMemberSuccess}
                className="px-3 py-1.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50"
              >
                {isAddingMember ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </form>
        )}

        {/* Members List */}
        <div className="space-y-2">
          {members.map((member) => {
            const isCurrentUser = member.userId === currentUserId;
            const isOwner = member.role === 'OWNER';
            const canEdit = canManageMembers && !isOwner && !isCurrentUser;
            const canRemove = canManageMembers && !isOwner;
            const displayName = member.user?.name || member.user?.email || member.userId;
            const displayEmail = member.user?.email;

            return (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-700">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {displayName}
                      {isCurrentUser && <span className="ml-2 text-gray-500">(you)</span>}
                    </p>
                    {displayEmail && displayEmail !== displayName && (
                      <p className="text-xs text-gray-500">{displayEmail}</p>
                    )}
                    <p className="text-xs text-gray-400">
                      Joined {new Date(member.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {editingMember === member.userId ? (
                    <>
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as TenantRole)}
                        className="px-2 py-1 text-sm border border-gray-300 rounded-lg"
                      >
                        {tenant.role === 'OWNER' && <option value="ADMIN">Admin</option>}
                        <option value="MEMBER">Member</option>
                        <option value="VIEWER">Viewer</option>
                      </select>
                      <button
                        onClick={() => handleUpdateRole(member.userId, editRole)}
                        className="p-1 text-success-600 hover:bg-success-50 rounded"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setEditingMember(null)}
                        className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </>
                  ) : (
                    <>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[member.role]}`}>
                        {ROLE_LABELS[member.role]}
                      </span>
                      {canEdit && (
                        <button
                          onClick={() => {
                            setEditingMember(member.userId);
                            setEditRole(member.role);
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                          title="Edit role"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      )}
                      {canRemove && !isCurrentUser && (
                        <button
                          onClick={() => handleRemoveMember(member.userId)}
                          className="p-1 text-gray-400 hover:text-danger-600 hover:bg-danger-50 rounded"
                          title="Remove member"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {members.length === 0 && (
          <p className="text-center text-gray-500 py-8">No members found</p>
        )}
      </div>

      {/* Role Permissions Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Role Permissions</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 font-medium text-gray-700">Permission</th>
                <th className="text-center py-2 font-medium text-purple-700">Owner</th>
                <th className="text-center py-2 font-medium text-blue-700">Admin</th>
                <th className="text-center py-2 font-medium text-green-700">Member</th>
                <th className="text-center py-2 font-medium text-gray-700">Viewer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-2 text-gray-600">View resources</td>
                <td className="text-center">✓</td>
                <td className="text-center">✓</td>
                <td className="text-center">✓</td>
                <td className="text-center">✓</td>
              </tr>
              <tr>
                <td className="py-2 text-gray-600">Create resources</td>
                <td className="text-center">✓</td>
                <td className="text-center">✓</td>
                <td className="text-center">✓</td>
                <td className="text-center">-</td>
              </tr>
              <tr>
                <td className="py-2 text-gray-600">Edit resources</td>
                <td className="text-center">✓</td>
                <td className="text-center">✓</td>
                <td className="text-center">✓</td>
                <td className="text-center">-</td>
              </tr>
              <tr>
                <td className="py-2 text-gray-600">Delete resources</td>
                <td className="text-center">✓</td>
                <td className="text-center">✓</td>
                <td className="text-center">✓</td>
                <td className="text-center">-</td>
              </tr>
              <tr>
                <td className="py-2 text-gray-600">Manage members</td>
                <td className="text-center">✓</td>
                <td className="text-center">✓</td>
                <td className="text-center">-</td>
                <td className="text-center">-</td>
              </tr>
              <tr>
                <td className="py-2 text-gray-600">Delete workspace</td>
                <td className="text-center">✓</td>
                <td className="text-center">-</td>
                <td className="text-center">-</td>
                <td className="text-center">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
