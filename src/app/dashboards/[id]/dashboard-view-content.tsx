'use client';

import { useState, useEffect, useCallback } from 'react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { Widget, WidgetRenderer } from '@/lib/dashboard-components';

interface User {
  id: string;
  name?: string | null;
  email?: string | null;
}

interface Dashboard {
  id: string;
  name: string;
  description?: string | null;
  layout: { columns: number; rowHeight: number };
  widgets: Widget[];
  connectionIds: string[];
}

interface DashboardViewContentProps {
  dashboardId: string;
  user: User;
}

export function DashboardViewContent({ dashboardId, user }: DashboardViewContentProps) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [widgetData, setWidgetData] = useState<Record<string, unknown>>({});
  const [widgetLoading, setWidgetLoading] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard
  useEffect(() => {
    fetchDashboard();
  }, [dashboardId]);

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

  // Fetch widget data
  const fetchWidgetData = useCallback(async (widget: Widget) => {
    if (!widget.config?.connectionId) {
      return;
    }

    setWidgetLoading((prev) => ({ ...prev, [widget.id]: true }));

    try {
      // For table widgets, don't send aggregation - we want raw data
      const isTableWidget = widget.type === 'table';
      // KPI and chart widgets need aggregation - default to 'count' if not set
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
        // For table widgets, extract items from paginated response
        const data = result.type === 'table' ? result.data.items : result.data;
        setWidgetData((prev) => ({ ...prev, [widget.id]: data }));
      }
    } catch (err) {
      console.error(`Failed to fetch data for widget ${widget.id}:`, err);
    } finally {
      setWidgetLoading((prev) => ({ ...prev, [widget.id]: false }));
    }
  }, [dashboardId]);

  // Fetch all widget data when dashboard loads
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-danger-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-danger-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link
            href="/dashboards"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
          >
            Back to Dashboards
          </Link>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/workspace" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold">
                  R
                </div>
                <span className="text-xl font-bold text-gray-900 hidden sm:block">RenderOps</span>
              </Link>
              <span className="text-gray-300">/</span>
              <Link href="/dashboards" className="text-gray-600 hover:text-gray-900">
                Dashboards
              </Link>
              <span className="text-gray-300">/</span>
              <span className="font-medium text-gray-900 truncate max-w-[200px]">{dashboard.name}</span>
            </div>
            <div className="flex items-center gap-3">
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

      {/* Dashboard Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {dashboard.description && (
          <p className="text-gray-600 mb-6">{dashboard.description}</p>
        )}

        {dashboard.widgets.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No widgets yet</h3>
            <p className="text-gray-500 mb-4">
              Add widgets to visualize your data
            </p>
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
      </main>
    </div>
  );
}
