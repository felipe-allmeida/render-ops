'use client';

import { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';

interface User {
  id: string;
  name?: string | null;
  email?: string | null;
}

interface Dashboard {
  id: string;
  name: string;
  description?: string | null;
  connectionIds: string[];
  createdAt: string;
  updatedAt: string;
}

interface DashboardsListContentProps {
  user: User;
}

export function DashboardsListContent({ user }: DashboardsListContentProps) {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboards();
  }, []);

  const fetchDashboards = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/dashboards');
      if (response.ok) {
        const data = await response.json();
        setDashboards(data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboards:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDashboard = async (id: string) => {
    if (!confirm('Are you sure you want to delete this dashboard?')) {
      return;
    }

    try {
      const response = await fetch(`/api/dashboards/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchDashboards();
      }
    } catch (error) {
      console.error('Failed to delete dashboard:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/workspace" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold">
                  R
                </div>
                <span className="text-xl font-bold text-gray-900">RenderOps</span>
              </Link>
              <span className="text-gray-300">/</span>
              <span className="font-medium text-gray-700">Dashboards</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/workspace"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Workspace
              </Link>
              <span className="text-sm text-gray-600 hidden sm:block">{user.email}</span>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboards</h1>
            <p className="text-gray-600 mt-1">Create and manage analytics dashboards</p>
          </div>
          <Link
            href="/dashboards/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Create Dashboard</span>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="h-6 w-48 skeleton rounded mb-3" />
                <div className="h-4 w-32 skeleton rounded mb-4" />
                <div className="h-4 w-24 skeleton rounded" />
              </div>
            ))}
          </div>
        ) : dashboards.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No dashboards yet</h3>
            <p className="text-gray-500 mb-4">
              Create your first dashboard to visualize your data
            </p>
            <Link
              href="/dashboards/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Create Dashboard</span>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {dashboards.map((dashboard) => (
              <div
                key={dashboard.id}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-sm transition-shadow group"
              >
                <div className="flex items-start justify-between mb-3">
                  <Link
                    href={`/dashboards/${dashboard.id}`}
                    className="font-semibold text-gray-900 hover:text-primary-600"
                  >
                    {dashboard.name}
                  </Link>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                      href={`/dashboards/${dashboard.id}/edit`}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </Link>
                    <button
                      onClick={() => handleDeleteDashboard(dashboard.id)}
                      className="p-1.5 text-gray-400 hover:text-danger-600 hover:bg-danger-50 rounded"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                {dashboard.description && (
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                    {dashboard.description}
                  </p>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">
                    {dashboard.connectionIds.length} connection{dashboard.connectionIds.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-gray-400">
                    Updated {new Date(dashboard.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <Link
                  href={`/dashboards/${dashboard.id}`}
                  className="mt-4 block w-full text-center py-2 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
                >
                  View Dashboard
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
