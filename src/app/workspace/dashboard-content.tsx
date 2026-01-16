'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { DynamicUI } from './dynamic-ui';
import { Widget, WidgetRenderer } from '@/lib/dashboard-components';

interface User {
  id: string;
  name?: string | null;
  email?: string | null;
}

interface Integration {
  id: string;
  name: string;
  readonly: boolean;
  createdAt: string;
}

interface TableInfo {
  name: string;
  rowCount?: number;
}

interface DashboardInfo {
  id: string;
  name: string;
  description?: string | null;
  updatedAt: string;
}

interface DashboardFull {
  id: string;
  name: string;
  description?: string | null;
  layout: { columns: number; rowHeight: number };
  widgets: Widget[];
}

interface DashboardContentProps {
  user: User;
}

// Icons
const Icons = {
  menu: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  x: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  database: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  ),
  table: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125" />
    </svg>
  ),
  settings: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  logout: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
  ),
  plus: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  ),
  check: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  lightning: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  ),
  shield: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  ),
  cursor: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
    </svg>
  ),
  postgres: (
    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
    </svg>
  ),
  mysql: (
    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
    </svg>
  ),
  chart: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
    </svg>
  ),
};

// Database types available
const DATABASE_TYPES = [
  { id: 'postgresql', name: 'PostgreSQL', available: true, icon: '🐘' },
  { id: 'mysql', name: 'MySQL', available: false, icon: '🐬' },
  { id: 'mongodb', name: 'MongoDB', available: false, icon: '🍃' },
  { id: 'sqlserver', name: 'SQL Server', available: false, icon: '🗄️' },
];

export function DashboardContent({ user }: DashboardContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get current view from URL
  const currentView = searchParams.get('view'); // 'table' | 'dashboard' | 'settings' | null
  const selectedTable = currentView === 'table' ? searchParams.get('name') : null;
  const selectedDashboard = currentView === 'dashboard' ? searchParams.get('id') : null;
  const showSettings = currentView === 'settings';

  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [activeIntegration, setActiveIntegration] = useState<Integration | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [dashboards, setDashboards] = useState<DashboardInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);

  // Navigation helpers
  const navigateTo = useCallback((view: string | null, params?: Record<string, string>) => {
    if (!view) {
      router.push('/workspace');
      return;
    }
    const urlParams = new URLSearchParams();
    urlParams.set('view', view);
    if (params) {
      Object.entries(params).forEach(([key, value]) => urlParams.set(key, value));
    }
    router.push(`/workspace?${urlParams.toString()}`);
  }, [router]);

  const navigateToTable = useCallback((tableName: string) => {
    navigateTo('table', { name: tableName });
    setSidebarOpen(false);
  }, [navigateTo]);

  const navigateToDashboard = useCallback((dashboardId: string) => {
    navigateTo('dashboard', { id: dashboardId });
    setSidebarOpen(false);
  }, [navigateTo]);

  const navigateToSettings = useCallback(() => {
    navigateTo('settings');
    setSidebarOpen(false);
  }, [navigateTo]);

  // Integration form state
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: '5432',
    database: '',
    username: '',
    password: '',
    ssl: false,
    dbType: 'postgresql',
    connectionString: '',
    readonly: false,
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputMode, setInputMode] = useState<'fields' | 'string'>('fields');

  // Fetch integrations and dashboards on mount
  useEffect(() => {
    fetchIntegrations();
    fetchDashboards();
  }, []);

  // Load tables when integration is selected
  useEffect(() => {
    if (activeIntegration) {
      fetchTables(activeIntegration.id);
    }
  }, [activeIntegration]);

  const fetchDashboards = async () => {
    try {
      const response = await fetch('/api/dashboards');
      if (response.ok) {
        const data = await response.json();
        setDashboards(data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboards:', error);
    }
  };

  const fetchIntegrations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/connections');
      if (response.ok) {
        const data = await response.json();
        setIntegrations(data);
        // Auto-select first integration if exists
        if (data.length > 0) {
          setActiveIntegration(data[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTables = async (integrationId: string) => {
    try {
      setIsLoadingTables(true);
      const response = await fetch(`/api/connections/${integrationId}/tables`);
      if (response.ok) {
        const data = await response.json();
        setTables(data.tables || []);
      }
    } catch (error) {
      console.error('Failed to fetch tables:', error);
    } finally {
      setIsLoadingTables(false);
    }
  };

  const handleCreateIntegration = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      // Build payload based on input mode - only include relevant fields
      const payload: Record<string, unknown> = {
        name: formData.name.trim(),
        readonly: formData.readonly,
        dbType: formData.dbType,
      };

      if (inputMode === 'string') {
        payload.connectionString = formData.connectionString.trim();
      } else {
        payload.host = formData.host.trim();
        payload.port = formData.port.trim();
        payload.database = formData.database.trim();
        payload.username = formData.username.trim();
        payload.password = formData.password;
        payload.ssl = formData.ssl;
      }

      const response = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create integration');
      }

      setShowIntegrationModal(false);
      setFormData({
        name: '',
        host: '',
        port: '5432',
        database: '',
        username: '',
        password: '',
        ssl: false,
        dbType: 'postgresql',
        connectionString: '',
        readonly: false,
      });
      await fetchIntegrations();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to create integration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteIntegration = async (id: string) => {
    if (!confirm('Are you sure you want to remove this integration? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/connections/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        if (activeIntegration?.id === id) {
          setActiveIntegration(null);
          setTables([]);
          navigateTo(null);
        }
        await fetchIntegrations();
      }
    } catch (error) {
      console.error('Failed to delete integration:', error);
    }
  };

  const formatTableName = (name: string) => {
    return name
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  // Onboarding - No integrations yet
  if (integrations.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Simple Header */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold">
                  R
                </div>
                <span className="text-xl font-bold text-gray-900">RenderOps</span>
              </div>
              <div className="flex items-center gap-4">
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

        {/* Onboarding Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Welcome to RenderOps
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Transform your database into a powerful admin portal in seconds.
              No coding required. Just connect and start managing your data.
            </p>
          </div>

          {/* Features */}
          <div className="grid sm:grid-cols-3 gap-6 mb-12">
            <div className="bg-white rounded-xl p-6 shadow-card">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600 mb-4">
                {Icons.lightning}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Instant Setup</h3>
              <p className="text-sm text-gray-600">
                Connect your database and get a fully functional admin panel automatically generated.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-card">
              <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center text-success-600 mb-4">
                {Icons.shield}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Secure by Design</h3>
              <p className="text-sm text-gray-600">
                Your credentials are encrypted. We never store your data - only the connection.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-card">
              <div className="w-12 h-12 bg-warning-100 rounded-xl flex items-center justify-center text-warning-600 mb-4">
                {Icons.cursor}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">User Friendly</h3>
              <p className="text-sm text-gray-600">
                Designed for non-technical users. Your team can manage data without SQL knowledge.
              </p>
            </div>
          </div>

          {/* CTA Card */}
          <div className="bg-white rounded-2xl shadow-elevated p-8 sm:p-10">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Connect Your First Database
              </h2>
              <p className="text-gray-600">
                Start by connecting a database. We currently support PostgreSQL.
              </p>
            </div>

            {/* Database Type Selection */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {DATABASE_TYPES.map((db) => (
                <button
                  key={db.id}
                  onClick={() => db.available && setShowIntegrationModal(true)}
                  disabled={!db.available}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    db.available
                      ? 'border-primary-200 bg-primary-50 hover:border-primary-400 cursor-pointer'
                      : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
                  }`}
                >
                  <div className="text-3xl mb-2">{db.icon}</div>
                  <div className="text-sm font-medium text-gray-900">{db.name}</div>
                  {!db.available && (
                    <div className="text-xs text-gray-500 mt-1">Coming soon</div>
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowIntegrationModal(true)}
              className="w-full sm:w-auto mx-auto flex items-center justify-center gap-2 px-8 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
            >
              {Icons.plus}
              <span>Connect PostgreSQL Database</span>
            </button>
          </div>
        </main>

        {/* Integration Modal */}
        {showIntegrationModal && (
          <IntegrationModal
            formData={formData}
            setFormData={setFormData}
            formError={formError}
            isSubmitting={isSubmitting}
            inputMode={inputMode}
            setInputMode={setInputMode}
            onSubmit={handleCreateIntegration}
            onClose={() => setShowIntegrationModal(false)}
          />
        )}
      </div>
    );
  }

  // Main Portal Layout - Has integrations
  return (
    <div className="min-h-screen md:h-screen bg-gray-50 flex md:overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-auto lg:h-full lg:flex-shrink-0 overflow-hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-2 px-4 h-16 border-b border-gray-100">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold">
              R
            </div>
            <span className="text-lg font-bold text-gray-900">RenderOps</span>
          </div>

          {/* Integration Selector */}
          {integrations.length > 1 && (
            <div className="px-3 py-3 border-b border-gray-100">
              <select
                value={activeIntegration?.id || ''}
                onChange={(e) => {
                  const integration = integrations.find((i) => i.id === e.target.value);
                  if (integration) {
                    setActiveIntegration(integration);
                    navigateTo(null);
                  }
                }}
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                {integrations.map((integration) => (
                  <option key={integration.id} value={integration.id}>
                    {integration.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sidebar Content - scrollable middle section */}
          <div className="flex-1 min-h-0 overflow-y-auto py-3">
            {/* Dashboards Section */}
            <div className="mb-4">
              <div className="px-3 mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Dashboards
                </span>
                <button
                  onClick={fetchDashboards}
                  className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                  title="Refresh dashboards"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              {dashboards.length === 0 ? (
                <div className="px-3 py-3">
                  <div className="text-center py-4 px-3 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <div className="text-gray-400 mb-2">{Icons.chart}</div>
                    <p className="text-xs text-gray-500 mb-2">No dashboards yet</p>
                    <Link
                      href="/dashboards/new"
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
                    >
                      {Icons.plus}
                      <span>Create Dashboard</span>
                    </Link>
                  </div>
                </div>
              ) : (
                <nav className="px-2 space-y-1">
                  {dashboards.map((dashboard) => (
                    <button
                      key={dashboard.id}
                      onClick={() => navigateToDashboard(dashboard.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        selectedDashboard === dashboard.id
                          ? 'bg-primary-50 text-primary-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-gray-400">{Icons.chart}</span>
                      <span className="truncate">{dashboard.name}</span>
                    </button>
                  ))}
                  <Link
                    href="/dashboards/new"
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-primary-600 hover:bg-primary-50 transition-colors"
                  >
                    <span>{Icons.plus}</span>
                    <span>New Dashboard</span>
                  </Link>
                </nav>
              )}
            </div>

            {/* Divider */}
            <div className="px-3 mb-4">
              <div className="border-t border-gray-100" />
            </div>

            {/* Tables Section */}
            <div>
              <div className="px-3 mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Tables
                </span>
                <button
                  onClick={() => activeIntegration && fetchTables(activeIntegration.id)}
                  disabled={isLoadingTables}
                  className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors disabled:opacity-50"
                  title="Refresh tables"
                >
                  <svg
                    className={`w-4 h-4 ${isLoadingTables ? 'animate-spin' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              {isLoadingTables ? (
                <div className="px-3 space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-10 skeleton rounded-lg" />
                  ))}
                </div>
              ) : tables.length === 0 ? (
                <div className="px-3 py-3">
                  <div className="text-center py-4 px-3 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <div className="text-gray-400 mb-2">{Icons.table}</div>
                    <p className="text-xs text-gray-500 mb-2">No tables found</p>
                    <button
                      onClick={navigateToSettings}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
                    >
                      {Icons.database}
                      <span>Manage Connections</span>
                    </button>
                  </div>
                </div>
              ) : (
                <nav className="px-2 space-y-1">
                  {tables.map((table) => (
                    <button
                      key={table.name}
                      onClick={() => navigateToTable(table.name)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        selectedTable === table.name
                          ? 'bg-primary-50 text-primary-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-gray-400">{Icons.table}</span>
                      <span className="truncate">{formatTableName(table.name)}</span>
                    </button>
                  ))}
                </nav>
              )}
            </div>
          </div>

          {/* Bottom Section */}
          <div className="flex-shrink-0 border-t border-gray-100 p-3 space-y-1">
            <button
              onClick={navigateToSettings}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                showSettings
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="text-gray-400">{Icons.settings}</span>
              <span>Integrations</span>
            </button>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <span className="text-gray-400">{Icons.logout}</span>
              <span>Sign Out</span>
            </button>
          </div>

          {/* User Info */}
          <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100 bg-gray-50/50">
            <div className="text-sm font-medium text-gray-900 truncate">
              {user.name || 'User'}
            </div>
            <div className="text-xs text-gray-500 truncate">{user.email}</div>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 md:min-h-0">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="flex items-center justify-between px-4 h-14">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              {Icons.menu}
            </button>
            <span className="font-semibold text-gray-900 truncate max-w-[200px]">
              {showSettings
                ? 'Integrations'
                : selectedTable
                ? formatTableName(selectedTable)
                : selectedDashboard
                ? dashboards.find(d => d.id === selectedDashboard)?.name || 'Dashboard'
                : 'Select a table'}
            </span>
            <div className="w-10" /> {/* Spacer */}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 md:min-h-0 flex flex-col overflow-y-auto md:overflow-hidden">
          {showSettings ? (
            /* Settings / Integrations Page */
            <div className="flex-1 overflow-auto max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
                  <p className="text-gray-600 mt-1">Manage your database connections</p>
                </div>
                <button
                  onClick={() => setShowIntegrationModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
                >
                  {Icons.plus}
                  <span className="hidden sm:inline">Add Integration</span>
                </button>
              </div>

              <div className="space-y-4">
                {integrations.map((integration) => (
                  <div
                    key={integration.id}
                    className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-2xl">
                          🐘
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{integration.name}</h3>
                          <p className="text-sm text-gray-500">
                            PostgreSQL • Connected{' '}
                            {new Date(integration.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="hidden sm:flex items-center gap-1.5 text-sm text-success-600 bg-success-50 px-3 py-1 rounded-full">
                          {Icons.check}
                          Active
                        </span>
                        <button
                          onClick={() => handleDeleteIntegration(integration.id)}
                          className="p-2 text-gray-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                          title="Remove integration"
                        >
                          {Icons.x}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add More Databases */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Supported Databases
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {DATABASE_TYPES.map((db) => (
                    <div
                      key={db.id}
                      className={`p-4 rounded-xl border ${
                        db.available
                          ? 'border-primary-200 bg-primary-50'
                          : 'border-gray-100 bg-gray-50 opacity-60'
                      }`}
                    >
                      <div className="text-2xl mb-2">{db.icon}</div>
                      <div className="text-sm font-medium text-gray-900">{db.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {db.available ? 'Available' : 'Coming soon'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : selectedTable && activeIntegration ? (
            /* Table CRUD UI */
            <div className="flex-1 md:min-h-0 flex flex-col overflow-y-auto md:overflow-hidden">
              <DynamicUI
                connectionId={activeIntegration.id}
                tableName={selectedTable}
                readonly={activeIntegration.readonly}
              />
            </div>
          ) : selectedDashboard ? (
            /* Dashboard View */
            <EmbeddedDashboard dashboardId={selectedDashboard} />
          ) : (
            /* Welcome State */
            <div className="flex-1 flex items-center justify-center px-4">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-400">
                  {Icons.table}
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Select a table to start
                </h2>
                <p className="text-gray-600">
                  Choose a table from the sidebar to view and manage your data.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Integration Modal */}
      {showIntegrationModal && (
        <IntegrationModal
          formData={formData}
          setFormData={setFormData}
          formError={formError}
          isSubmitting={isSubmitting}
          inputMode={inputMode}
          setInputMode={setInputMode}
          onSubmit={handleCreateIntegration}
          onClose={() => setShowIntegrationModal(false)}
        />
      )}
    </div>
  );
}

// Integration Modal Component
function IntegrationModal({
  formData,
  setFormData,
  inputMode,
  setInputMode,
  formError,
  isSubmitting,
  onSubmit,
  onClose,
}: {
  formData: {
    name: string;
    host: string;
    port: string;
    database: string;
    username: string;
    password: string;
    ssl: boolean;
    dbType: string;
    connectionString: string;
    readonly: boolean;
  };
  setFormData: React.Dispatch<React.SetStateAction<typeof formData>>;
  inputMode: 'fields' | 'string';
  setInputMode: React.Dispatch<React.SetStateAction<'fields' | 'string'>>;
  formError: string;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}) {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: { version?: string; tableCount?: number; responseTime?: string };
  } | null>(null);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const payload = inputMode === 'string'
        ? { connectionString: formData.connectionString.trim() }
        : {
            host: formData.host.trim(),
            port: formData.port.trim(),
            database: formData.database.trim(),
            username: formData.username.trim(),
            password: formData.password,
            ssl: formData.ssl,
          };

      const response = await fetch('/api/connections/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        setTestResult({
          success: true,
          message: result.message,
          details: result.details,
        });
      } else {
        setTestResult({
          success: false,
          message: result.details || result.error || 'Connection failed',
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Test failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-modal max-w-lg w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Connect Database</h3>
              <p className="text-sm text-gray-500">Add your PostgreSQL connection details</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit}>
            <div className="px-6 py-4 space-y-4">
              {formError && (
                <div className="p-3 bg-danger-50 border border-danger-200 text-danger-700 text-sm rounded-lg">
                  {formError}
                </div>
              )}

              {/* Connection Name - always visible */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Connection Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Production Database"
                  className="input-base"
                  required
                />
              </div>

              {/* Input Mode Toggle */}
              <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setInputMode('fields')}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all ${
                    inputMode === 'fields'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Fields
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('string')}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all ${
                    inputMode === 'string'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Connection String
                </button>
              </div>

              {/* Fields Mode */}
              {inputMode === 'fields' && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Host
                      </label>
                      <input
                        type="text"
                        value={formData.host}
                        onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                        placeholder="localhost"
                        className="input-base"
                        required={inputMode === 'fields'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Port
                      </label>
                      <input
                        type="text"
                        value={formData.port}
                        onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                        placeholder="5432"
                        className="input-base"
                        required={inputMode === 'fields'}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Database Name
                    </label>
                    <input
                      type="text"
                      value={formData.database}
                      onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                      placeholder="myapp_production"
                      className="input-base"
                      required={inputMode === 'fields'}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Username
                      </label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        placeholder="postgres"
                        className="input-base"
                        required={inputMode === 'fields'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Password
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="••••••••"
                        className="input-base"
                        required={inputMode === 'fields'}
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.ssl}
                      onChange={(e) => setFormData({ ...formData, ssl: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Use SSL connection</span>
                  </label>
                </>
              )}

              {/* Connection String Mode */}
              {inputMode === 'string' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Connection String
                  </label>
                  <textarea
                    value={formData.connectionString}
                    onChange={(e) => setFormData({ ...formData, connectionString: e.target.value })}
                    placeholder="postgresql://user:password@host:5432/database"
                    className="input-base font-mono text-sm"
                    rows={3}
                    required={inputMode === 'string'}
                  />
                  <p className="mt-1.5 text-xs text-gray-500">
                    Format: postgresql://user:password@host:port/database
                  </p>
                </div>
              )}

              {/* Separator */}
              <div className="border-t border-gray-100 pt-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.readonly}
                    onChange={(e) => setFormData({ ...formData, readonly: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Read-only mode</span>
                    <p className="text-xs text-gray-500">Disable create, edit and delete operations</p>
                  </div>
                </label>
              </div>

              {/* Test Connection */}
              <div className="border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting || (inputMode === 'fields' && (!formData.host || !formData.database || !formData.username)) || (inputMode === 'string' && !formData.connectionString)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isTesting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>Test Connection</span>
                    </>
                  )}
                </button>

                {/* Test Result */}
                {testResult && (
                  <div
                    className={`mt-3 p-3 rounded-lg text-sm ${
                      testResult.success
                        ? 'bg-success-50 border border-success-200 text-success-700'
                        : 'bg-danger-50 border border-danger-200 text-danger-700'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {testResult.success ? (
                        <svg className="w-5 h-5 flex-shrink-0 text-success-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 flex-shrink-0 text-danger-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{testResult.success ? 'Connection successful!' : 'Connection failed'}</p>
                        {testResult.success && testResult.details && (
                          <div className="mt-1 text-xs space-y-0.5 text-success-600">
                            <p>{testResult.details.version}</p>
                            <p>{testResult.details.tableCount} tables found • {testResult.details.responseTime}</p>
                          </div>
                        )}
                        {!testResult.success && (
                          <p className="mt-1 text-xs break-words">{testResult.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {isSubmitting && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {isSubmitting ? 'Connecting...' : 'Connect Database'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Embedded Dashboard Component - for displaying dashboards within the workspace
function EmbeddedDashboard({ dashboardId }: { dashboardId: string }) {
  const [dashboard, setDashboard] = useState<DashboardFull | null>(null);
  const [widgetData, setWidgetData] = useState<Record<string, unknown>>({});
  const [widgetLoading, setWidgetLoading] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWidgetData = useCallback(async (widget: Widget) => {
    if (!widget.config?.connectionId) return;

    setWidgetLoading((prev) => ({ ...prev, [widget.id]: true }));

    try {
      const isTableWidget = widget.type === 'table';
      const aggregation = isTableWidget ? undefined : (widget.config.aggregation || 'count');

      const response = await fetch(`/api/dashboards/${dashboardId}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widgetId: widget.id,
          connectionId: widget.config.connectionId,
          table: widget.config.table,
          aggregation,
          field: isTableWidget ? undefined : widget.config.field,
          groupBy: isTableWidget ? undefined : widget.config.groupBy,
          datePeriod: isTableWidget ? undefined : widget.config.datePeriod,
        }),
      });

      const result = await response.json();

      if (result.success) {
        const data = result.type === 'table' ? result.data.items : result.data;
        setWidgetData((prev) => ({ ...prev, [widget.id]: data }));
      }
    } catch (err) {
      console.error(`Failed to fetch data for widget ${widget.id}:`, err);
    } finally {
      setWidgetLoading((prev) => ({ ...prev, [widget.id]: false }));
    }
  }, [dashboardId]);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/dashboards/${dashboardId}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Dashboard not found');
          }
          throw new Error('Failed to load dashboard');
        }

        const data = await response.json();
        setDashboard(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, [dashboardId]);

  useEffect(() => {
    if (dashboard?.widgets) {
      dashboard.widgets.forEach((widget) => {
        if (widget.config?.connectionId) {
          fetchWidgetData(widget);
        }
      });
    }
  }, [dashboard, fetchWidgetData]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-danger-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-danger-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!dashboard) return null;

  return (
    <div className="flex-1 overflow-auto p-4 sm:p-6">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{dashboard.name}</h1>
          {dashboard.description && (
            <p className="text-gray-600 mt-1">{dashboard.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              dashboard.widgets.forEach((w) => {
                if (w.config?.connectionId) fetchWidgetData(w);
              });
            }}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            title="Refresh data"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <Link
            href={`/dashboards/${dashboardId}/edit`}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <span className="hidden sm:inline">Edit</span>
          </Link>
        </div>
      </div>

      {/* Widgets Grid */}
      {dashboard.widgets.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No widgets yet</h3>
          <p className="text-gray-500 mb-4">Add widgets to visualize your data</p>
          <Link
            href={`/dashboards/${dashboardId}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Widgets</span>
          </Link>
        </div>
      ) : (
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${dashboard.layout.columns}, 1fr)`,
            gridAutoRows: `${dashboard.layout.rowHeight}px`,
          }}
        >
          {dashboard.widgets.map((widget) => (
            <div
              key={widget.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
              style={{
                gridColumn: `${widget.x + 1} / span ${widget.width}`,
                gridRow: `${widget.y + 1} / span ${widget.height}`,
              }}
            >
              <WidgetRenderer
                widget={widget}
                data={widgetData[widget.id]}
                loading={widgetLoading[widget.id]}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
