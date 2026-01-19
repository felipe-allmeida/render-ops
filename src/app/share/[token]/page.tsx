'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Widget, WidgetRenderer } from '@/lib/dashboard-components';

interface DashboardData {
  id: string;
  name: string;
  description?: string | null;
  layout: { columns: number; rowHeight: number };
  widgets: Widget[];
  tenantName: string;
}

export default function SharedDashboardPage() {
  const params = useParams();
  const token = params.token as string;

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
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

      const response = await fetch(`/api/public/dashboard/${token}/query`, {
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
          filters: widget.config.filters,
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
  }, [token]);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/public/dashboard/${token}`);
        const data = await response.json();

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Dashboard not found');
          } else if (response.status === 403) {
            throw new Error('This dashboard is not public');
          } else if (response.status === 410) {
            throw new Error('This share link has expired');
          }
          throw new Error(data.error || 'Failed to load dashboard');
        }

        setDashboard(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchDashboard();
    }
  }, [token]);

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Unable to load dashboard</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return null;
  }

  const columns = dashboard.layout?.columns || 3;
  const rowHeight = dashboard.layout?.rowHeight || 120;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{dashboard.name}</h1>
              {dashboard.description && (
                <p className="text-sm text-gray-500 mt-1">{dashboard.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span>Shared by {dashboard.tenantName}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {dashboard.widgets.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500">This dashboard has no widgets.</p>
          </div>
        ) : (
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${columns}, 1fr)`,
              gridAutoRows: `${rowHeight}px`,
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

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-400">
          <p>Powered by RenderOps</p>
        </div>
      </main>
    </div>
  );
}
