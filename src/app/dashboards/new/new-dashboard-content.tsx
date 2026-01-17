'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DASHBOARD_TEMPLATES, createWidgetsFromTemplate, DashboardTemplate } from '@/lib/dashboard-templates';

interface User {
  id: string;
  name?: string | null;
  email?: string | null;
}

interface Connection {
  id: string;
  name: string;
}

interface NewDashboardContentProps {
  user: User;
  embedded?: boolean;
}

export function NewDashboardContent({ user, embedded = false }: NewDashboardContentProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedConnections, setSelectedConnections] = useState<string[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<DashboardTemplate>(DASHBOARD_TEMPLATES[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      const response = await fetch('/api/connections');
      if (response.ok) {
        const data = await response.json();
        setConnections(data);
      }
    } catch (err) {
      console.error('Failed to fetch connections:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Create widgets from selected template
      const widgets = createWidgetsFromTemplate(selectedTemplate);

      const response = await fetch('/api/dashboards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          connectionIds: selectedConnections,
          layout: { columns: selectedTemplate.columns, rowHeight: selectedTemplate.rowHeight },
          widgets,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create dashboard');
      }

      router.push(`/workspace?view=dashboard-edit&id=${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleConnection = (id: string) => {
    setSelectedConnections((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  if (embedded) {
    return (
      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Create New Dashboard</h1>
                  <p className="text-sm text-gray-500 mt-1">
                    Set up your dashboard to visualize data from your connections
                  </p>
                </div>
                <Link
                  href="/workspace"
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Link>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="px-6 py-5 space-y-6">
                {error && (
                  <div className="p-3 bg-danger-50 border border-danger-200 text-danger-700 text-sm rounded-lg">
                    {error}
                  </div>
                )}

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Dashboard Name <span className="text-danger-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Sales Overview"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of this dashboard..."
                    rows={3}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none"
                  />
                </div>

                {/* Template Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Layout Template <span className="text-danger-500">*</span>
                  </label>
                  <p className="text-sm text-gray-500 mb-3">
                    Choose a layout template for your dashboard
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {DASHBOARD_TEMPLATES.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => setSelectedTemplate(template)}
                        className={`p-4 rounded-lg border text-left transition-all ${
                          selectedTemplate.id === template.id
                            ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500/20'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="font-medium text-gray-900 mb-1">{template.name}</div>
                        <div className="text-xs text-gray-500 mb-3">{template.description}</div>
                        <pre className="text-[10px] text-gray-400 font-mono leading-tight whitespace-pre overflow-hidden">
                          {template.preview.trim()}
                        </pre>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Connections */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Data Sources
                  </label>
                  <p className="text-sm text-gray-500 mb-3">
                    Select which database connections this dashboard can use
                  </p>

                  {isLoading ? (
                    <div className="space-y-2">
                      {[1, 2].map((i) => (
                        <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : connections.length === 0 ? (
                    <div className="text-center py-6 px-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                      <p className="text-sm text-gray-500">No connections available. Add a connection first.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {connections.map((connection) => (
                        <label
                          key={connection.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedConnections.includes(connection.id)
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedConnections.includes(connection.id)}
                            onChange={() => toggleConnection(connection.id)}
                            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center text-xl">
                            🐘
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{connection.name}</div>
                            <div className="text-sm text-gray-500">PostgreSQL</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
                <Link
                  href="/workspace"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting && (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {isSubmitting ? 'Creating...' : 'Create Dashboard'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/workspace" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold">
                  R
                </div>
                <span className="text-xl font-bold text-gray-900 hidden sm:block">RenderOps</span>
              </Link>
              <span className="text-gray-300">/</span>
              <span className="font-medium text-gray-900">New Dashboard</span>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-5 border-b border-gray-100">
            <h1 className="text-xl font-semibold text-gray-900">Create New Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">
              Set up your dashboard to visualize data from your connections
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="px-6 py-5 space-y-6">
              {error && (
                <div className="p-3 bg-danger-50 border border-danger-200 text-danger-700 text-sm rounded-lg">
                  {error}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Dashboard Name <span className="text-danger-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Sales Overview"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this dashboard..."
                  rows={3}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none"
                />
              </div>

              {/* Template Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Layout Template <span className="text-danger-500">*</span>
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  Choose a layout template for your dashboard
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {DASHBOARD_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setSelectedTemplate(template)}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        selectedTemplate.id === template.id
                          ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500/20'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="font-medium text-gray-900 mb-1">{template.name}</div>
                      <div className="text-xs text-gray-500 mb-3">{template.description}</div>
                      <pre className="text-[10px] text-gray-400 font-mono leading-tight whitespace-pre overflow-hidden">
                        {template.preview.trim()}
                      </pre>
                    </button>
                  ))}
                </div>
              </div>

              {/* Connections */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Data Sources
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  Select which database connections this dashboard can use
                </p>

                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : connections.length === 0 ? (
                  <div className="text-center py-6 px-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">No connections available</p>
                    <Link
                      href="/workspace"
                      className="text-sm font-medium text-primary-600 hover:text-primary-700"
                    >
                      Add a connection first
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {connections.map((connection) => (
                      <label
                        key={connection.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedConnections.includes(connection.id)
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedConnections.includes(connection.id)}
                          onChange={() => toggleConnection(connection.id)}
                          className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center text-xl">
                          🐘
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{connection.name}</div>
                          <div className="text-sm text-gray-500">PostgreSQL</div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
              <Link
                href="/workspace"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {isSubmitting ? 'Creating...' : 'Create Dashboard'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
