'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ResponsiveGridLayout, LayoutItem } from 'react-grid-layout';
import type { Layout, ResponsiveLayouts } from 'react-grid-layout';
import { Widget, WidgetRenderer } from '@/lib/dashboard-components';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

interface User {
  id: string;
  name?: string | null;
  email?: string | null;
}

interface Connection {
  id: string;
  name: string;
}

interface TableInfo {
  name: string;
  type: string;
}

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
}

interface Dashboard {
  id: string;
  name: string;
  description?: string | null;
  layout: { columns: number; rowHeight: number };
  widgets: Widget[];
  connectionIds: string[];
}

interface DashboardEditContentProps {
  dashboardId: string;
  user: User;
  embedded?: boolean;
}

const CHART_TYPES = [
  { id: 'bar', name: 'Bar Chart' },
  { id: 'line', name: 'Line Chart' },
  { id: 'pie', name: 'Pie Chart' },
  { id: 'area', name: 'Area Chart' },
];

const AGGREGATION_TYPES = [
  { id: 'count', name: 'Count', needsField: false },
  { id: 'sum', name: 'Sum', needsField: true },
  { id: 'avg', name: 'Average', needsField: true },
  { id: 'min', name: 'Minimum', needsField: true },
  { id: 'max', name: 'Maximum', needsField: true },
];

const WIDGET_ICONS: Record<string, string> = {
  kpi: '📊',
  chart: '📈',
  table: '📋',
  text: '📝',
};

const DATE_PERIODS = [
  { id: '', name: 'Sem agrupamento por data' },
  { id: 'day', name: 'Por dia' },
  { id: 'week', name: 'Por semana' },
  { id: 'month', name: 'Por mês' },
  { id: 'year', name: 'Por ano' },
];

const DATE_TYPES = ['date', 'timestamp', 'timestamp with time zone', 'timestamp without time zone', 'timestamptz'];

export function DashboardEditContent({ dashboardId, user, embedded = false }: DashboardEditContentProps) {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [tables, setTables] = useState<Record<string, TableInfo[]>>({});
  const [columns, setColumns] = useState<Record<string, ColumnInfo[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [showMobileConfig, setShowMobileConfig] = useState(false);

  // Preview data state
  const [widgetData, setWidgetData] = useState<Record<string, unknown>>({});
  const [widgetLoading, setWidgetLoading] = useState<Record<string, boolean>>({});

  // Get selected widget
  const selectedWidget = dashboard?.widgets.find((w) => w.id === selectedWidgetId) || null;

  // Fetch dashboard and connections
  useEffect(() => {
    fetchDashboard();
    fetchConnections();
  }, [dashboardId]);

  const fetchDashboard = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/dashboards/${dashboardId}`);
      if (!response.ok) throw new Error('Failed to load dashboard');
      const data = await response.json();
      setDashboard(data);
      if (data.widgets.length > 0) {
        setSelectedWidgetId(data.widgets[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchConnections = async () => {
    try {
      const response = await fetch('/api/connections');
      if (response.ok) {
        const data = await response.json();
        setConnections(data);
      }
    } catch (error) {
      console.error('Failed to fetch connections:', error);
    }
  };

  const fetchTables = useCallback(async (connectionId: string) => {
    if (tables[connectionId]) return tables[connectionId];

    try {
      const response = await fetch(`/api/connections/${connectionId}/tables`);
      if (response.ok) {
        const data = await response.json();
        const tableList = data.tables || [];
        setTables((prev) => ({ ...prev, [connectionId]: tableList }));
        return tableList;
      }
    } catch (error) {
      console.error('Failed to fetch tables:', error);
    }
    return [];
  }, [tables]);

  const fetchColumns = useCallback(async (connectionId: string, tableName: string) => {
    const key = `${connectionId}:${tableName}`;
    if (columns[key]) return columns[key];

    try {
      const response = await fetch(`/api/connections/${connectionId}/tables/${tableName}/columns`);
      if (response.ok) {
        const data = await response.json();
        const columnList = data.columns || [];
        setColumns((prev) => ({ ...prev, [key]: columnList }));
        return columnList;
      }
    } catch (error) {
      console.error('Failed to fetch columns:', error);
    }
    return [];
  }, [columns]);

  // Fetch widget data for preview
  const fetchWidgetData = useCallback(async (widget: Widget) => {
    if (!widget.config?.connectionId || !widget.config?.table) {
      return;
    }

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

  // Load tables when widget is selected
  useEffect(() => {
    if (selectedWidget?.config?.connectionId) {
      fetchTables(selectedWidget.config.connectionId);
      if (selectedWidget.config?.table) {
        fetchColumns(selectedWidget.config.connectionId, selectedWidget.config.table);
      }
    }
  }, [selectedWidget, fetchTables, fetchColumns]);

  // Fetch preview data on initial load only
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  useEffect(() => {
    if (dashboard?.widgets && !initialLoadDone) {
      setInitialLoadDone(true);
      dashboard.widgets.forEach((widget) => {
        if (widget.config?.connectionId && widget.config?.table) {
          fetchWidgetData(widget);
        }
      });
    }
  }, [dashboard?.widgets, initialLoadDone, fetchWidgetData]);

  const handleSave = async () => {
    if (!dashboard) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/dashboards/${dashboardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: dashboard.name,
          description: dashboard.description,
          layout: dashboard.layout,
          widgets: dashboard.widgets,
        }),
      });

      if (!response.ok) throw new Error('Failed to save dashboard');

      router.push(`/workspace?view=dashboard&id=${dashboardId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  // Convert widgets to react-grid-layout format
  const getLayouts = (): ResponsiveLayouts => {
    if (!dashboard) return { lg: [] };
    const layoutItems: LayoutItem[] = dashboard.widgets.map((w) => ({
      i: w.id,
      x: w.x,
      y: w.y,
      w: w.width,
      h: w.height,
      minW: w.type === 'kpi' ? 2 : 3,
      minH: w.type === 'kpi' ? 1 : 2,
    }));
    return { lg: layoutItems };
  };

  // Handle layout change from react-grid-layout
  const handleLayoutChange = (layout: Layout) => {
    if (!dashboard) return;

    const updatedWidgets = dashboard.widgets.map((widget) => {
      const layoutItem = layout.find((l: LayoutItem) => l.i === widget.id);
      if (layoutItem) {
        return {
          ...widget,
          x: layoutItem.x,
          y: layoutItem.y,
          width: layoutItem.w,
          height: layoutItem.h,
        };
      }
      return widget;
    });

    setDashboard({ ...dashboard, widgets: updatedWidgets });
  };

  const updateWidget = (widgetId: string, updates: Partial<Widget>) => {
    if (!dashboard) return;
    setDashboard({
      ...dashboard,
      widgets: dashboard.widgets.map((w) =>
        w.id === widgetId ? { ...w, ...updates } : w
      ),
    });
  };

  const updateWidgetConfig = (widgetId: string, configUpdates: Partial<Widget['config']>) => {
    if (!dashboard) return;
    setDashboard({
      ...dashboard,
      widgets: dashboard.widgets.map((w) =>
        w.id === widgetId
          ? { ...w, config: { ...w.config, ...configUpdates } }
          : w
      ),
    });
  };

  const updateWidgetConfigAndRefresh = (widgetId: string, configUpdates: Partial<Widget['config']>) => {
    if (!dashboard) return;

    const updatedWidget = dashboard.widgets.find((w) => w.id === widgetId);
    if (!updatedWidget) return;

    const newConfig = { ...updatedWidget.config, ...configUpdates };
    const newWidget = { ...updatedWidget, config: newConfig };

    setDashboard({
      ...dashboard,
      widgets: dashboard.widgets.map((w) => (w.id === widgetId ? newWidget : w)),
    });

    if (newConfig.connectionId && newConfig.table) {
      setTimeout(() => fetchWidgetData(newWidget), 100);
    }
  };

  const handleConnectionChange = async (connectionId: string) => {
    if (!selectedWidgetId) return;
    updateWidgetConfig(selectedWidgetId, {
      connectionId,
      table: undefined,
      field: undefined,
      groupBy: undefined,
    });
    setWidgetData((prev) => {
      const newData = { ...prev };
      delete newData[selectedWidgetId];
      return newData;
    });
    if (connectionId) {
      await fetchTables(connectionId);
    }
  };

  const handleTableChange = async (tableName: string) => {
    if (!selectedWidgetId || !selectedWidget?.config?.connectionId) return;

    const newConfig = {
      ...selectedWidget.config,
      table: tableName,
      field: undefined,
      groupBy: undefined,
    };

    setDashboard({
      ...dashboard!,
      widgets: dashboard!.widgets.map((w) =>
        w.id === selectedWidgetId ? { ...w, config: newConfig } : w
      ),
    });

    if (tableName) {
      await fetchColumns(selectedWidget.config.connectionId, tableName);
      const updatedWidget = { ...selectedWidget, config: newConfig };
      setTimeout(() => fetchWidgetData(updatedWidget), 100);
    }
  };

  const addWidget = (type: 'kpi' | 'chart' | 'table' | 'text') => {
    if (!dashboard) return;

    const maxY = dashboard.widgets.reduce((max, w) => Math.max(max, w.y + w.height), 0);
    const sizes: Record<string, { width: number; height: number }> = {
      kpi: { width: 3, height: 1 },
      chart: { width: 6, height: 3 },
      table: { width: 6, height: 3 },
      text: { width: 4, height: 1 },
    };

    const newWidget: Widget = {
      id: `widget-${Date.now()}`,
      type,
      title: type === 'kpi' ? 'New KPI' : type === 'chart' ? 'New Chart' : type === 'table' ? 'New Table' : 'New Text',
      x: 0,
      y: maxY,
      width: sizes[type].width,
      height: sizes[type].height,
      config: {
        aggregation: type === 'kpi' || type === 'chart' ? 'count' : undefined,
        chartType: type === 'chart' ? 'bar' : undefined,
      },
    };

    setDashboard({
      ...dashboard,
      widgets: [...dashboard.widgets, newWidget],
    });
    setSelectedWidgetId(newWidget.id);
    setShowAddWidget(false);
  };

  const deleteWidget = (widgetId: string) => {
    if (!dashboard) return;
    const remainingWidgets = dashboard.widgets.filter((w) => w.id !== widgetId);
    setDashboard({
      ...dashboard,
      widgets: remainingWidgets,
    });
    if (selectedWidgetId === widgetId) {
      setSelectedWidgetId(remainingWidgets[0]?.id || null);
    }
  };

  const handleWidgetClick = (widgetId: string) => {
    setSelectedWidgetId(widgetId);
    setShowMobileConfig(true);
  };

  const isWidgetConfigured = (widget: Widget) => {
    if (widget.type === 'text') return !!widget.config?.content;
    return !!(widget.config?.connectionId && widget.config?.table);
  };

  // Get current connection tables
  const currentTables = selectedWidget?.config?.connectionId
    ? tables[selectedWidget.config.connectionId] || []
    : [];

  // Get current table columns
  const columnKey = selectedWidget?.config?.connectionId && selectedWidget?.config?.table
    ? `${selectedWidget.config.connectionId}:${selectedWidget.config.table}`
    : '';
  const currentColumns = columns[columnKey] || [];

  const aggregationNeedsField = AGGREGATION_TYPES.find(
    (a) => a.id === selectedWidget?.config?.aggregation
  )?.needsField || false;

  // Container width for responsive grid - manual measurement for accuracy
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      const updateWidth = () => {
        const rect = node.getBoundingClientRect();
        setGridWidth(Math.floor(rect.width));
      };
      updateWidth();
      const observer = new ResizeObserver(updateWidth);
      observer.observe(node);
      return () => observer.disconnect();
    }
  }, []);
  const [gridWidth, setGridWidth] = useState(0);

  if (isLoading) {
    return (
      <div className={`${embedded ? 'flex-1' : 'min-h-screen'} bg-gray-50 flex items-center justify-center`}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading editor...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className={`${embedded ? 'flex-1' : 'min-h-screen'} bg-gray-50 flex items-center justify-center`}>
        <div className="text-center">
          <p className="text-danger-600 mb-4">{error || 'Dashboard not found'}</p>
          <Link href="/workspace" className="text-primary-600 hover:underline">
            Back to Workspace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`${embedded ? 'flex-1 flex flex-col overflow-hidden' : 'min-h-screen'} bg-gray-100 flex flex-col`}>
      {/* Header */}
      <header className={`bg-white border-b border-gray-200 ${embedded ? '' : 'sticky top-0'} z-10`}>
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center gap-3">
              <Link href={`/workspace?view=dashboard&id=${dashboardId}`} className="text-gray-500 hover:text-gray-700">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <input
                type="text"
                value={dashboard.name}
                onChange={(e) => setDashboard({ ...dashboard, name: e.target.value })}
                className="text-lg font-semibold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 px-0"
              />
            </div>
            <div className="flex items-center gap-2">
              {/* Add Widget Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowAddWidget(!showAddWidget)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="hidden sm:inline">Add Widget</span>
                </button>
                {showAddWidget && (
                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    <button
                      onClick={() => addWidget('kpi')}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <span>📊</span> KPI Card
                    </button>
                    <button
                      onClick={() => addWidget('chart')}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <span>📈</span> Chart
                    </button>
                    <button
                      onClick={() => addWidget('table')}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <span>📋</span> Table
                    </button>
                    <button
                      onClick={() => addWidget('text')}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <span>📝</span> Text
                    </button>
                  </div>
                )}
              </div>
              <Link
                href={`/workspace?view=dashboard&id=${dashboardId}`}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
              >
                Cancel
              </Link>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-1.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {isSaving && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Grid Area */}
        <div className="flex-1 p-4 overflow-auto min-w-0">
          <div className="max-w-7xl mx-auto w-full">
            <div ref={containerRef} className="bg-white rounded-xl border border-gray-200 min-h-full w-full">
            {gridWidth > 0 && (
              <ResponsiveGridLayout
                className="layout"
                width={gridWidth}
                layouts={getLayouts()}
                breakpoints={{ lg: 996, md: 768, sm: 480, xs: 0 }}
                cols={{ lg: 12, md: 12, sm: 6, xs: 4 }}
                rowHeight={dashboard.layout.rowHeight}
                onLayoutChange={(layout) => handleLayoutChange(layout)}
                margin={[12, 12]}
                containerPadding={[16, 16]}
              >
              {dashboard.widgets.map((widget) => {
                const configured = isWidgetConfigured(widget);
                const isSelected = widget.id === selectedWidgetId;
                const hasData = widgetData[widget.id] !== undefined;
                const isLoadingWidget = widgetLoading[widget.id];

                return (
                  <div
                    key={widget.id}
                    onClick={() => handleWidgetClick(widget.id)}
                    className={`rounded-xl border-2 transition-all cursor-pointer overflow-hidden bg-white ${
                      isSelected
                        ? 'border-primary-500 ring-4 ring-primary-500/20'
                        : configured
                        ? 'border-gray-200 hover:border-gray-300'
                        : 'border-dashed border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {configured && (hasData || isLoadingWidget) ? (
                      <div className="h-full w-full relative">
                        {isSelected && (
                          <div className="absolute top-2 right-2 z-10 px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
                            Selected
                          </div>
                        )}
                        <WidgetRenderer
                          widget={widget}
                          data={widgetData[widget.id]}
                          loading={isLoadingWidget}
                        />
                      </div>
                    ) : (
                      <div className="h-full p-4 flex flex-col">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-2xl">{WIDGET_ICONS[widget.type] || '📦'}</span>
                          {configured ? (
                            <span className="px-2 py-0.5 text-xs font-medium bg-success-100 text-success-700 rounded-full">
                              Loading...
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-xs font-medium bg-warning-100 text-warning-700 rounded-full">
                              Not configured
                            </span>
                          )}
                        </div>
                        <h4 className="font-medium text-gray-900 truncate">{widget.title}</h4>
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          {widget.type === 'kpi' && 'KPI Card'}
                          {widget.type === 'chart' && `${widget.config?.chartType || 'Bar'} Chart`}
                          {widget.type === 'table' && 'Data Table'}
                          {widget.type === 'text' && 'Text'}
                        </p>
                        {!configured && (
                          <p className="text-xs text-gray-400 mt-auto">Click to configure</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              </ResponsiveGridLayout>
            )}
            </div>
          </div>
        </div>

        {/* Config Panel - Desktop */}
        <div className="hidden lg:block w-96 bg-white border-l border-gray-200 overflow-y-auto">
          <ConfigPanel
            widget={selectedWidget}
            onDelete={() => selectedWidget && deleteWidget(selectedWidget.id)}
            onTitleChange={(title) => selectedWidgetId && updateWidget(selectedWidgetId, { title })}
            onConfigChange={(updates) => selectedWidgetId && updateWidgetConfig(selectedWidgetId, updates)}
            onConfigChangeAndRefresh={(updates) => selectedWidgetId && updateWidgetConfigAndRefresh(selectedWidgetId, updates)}
            onConnectionChange={handleConnectionChange}
            onTableChange={handleTableChange}
            onRefresh={() => selectedWidget && fetchWidgetData(selectedWidget)}
            connections={connections.filter((c) => dashboard.connectionIds.includes(c.id))}
            tables={currentTables}
            columns={currentColumns}
            isLoading={selectedWidget ? widgetLoading[selectedWidget.id] : false}
            isConfigured={selectedWidget ? isWidgetConfigured(selectedWidget) : false}
            aggregationNeedsField={aggregationNeedsField}
          />
        </div>

        {/* Mobile Config Overlay */}
        {showMobileConfig && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowMobileConfig(false)}
            />
            <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white overflow-y-auto">
              <button
                onClick={() => setShowMobileConfig(false)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 z-10"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <ConfigPanel
                widget={selectedWidget}
                onDelete={() => {
                  if (selectedWidget) {
                    deleteWidget(selectedWidget.id);
                    setShowMobileConfig(false);
                  }
                }}
                onTitleChange={(title) => selectedWidgetId && updateWidget(selectedWidgetId, { title })}
                onConfigChange={(updates) => selectedWidgetId && updateWidgetConfig(selectedWidgetId, updates)}
                onConfigChangeAndRefresh={(updates) => selectedWidgetId && updateWidgetConfigAndRefresh(selectedWidgetId, updates)}
                onConnectionChange={handleConnectionChange}
                onTableChange={handleTableChange}
                onRefresh={() => selectedWidget && fetchWidgetData(selectedWidget)}
                connections={connections.filter((c) => dashboard.connectionIds.includes(c.id))}
                tables={currentTables}
                columns={currentColumns}
                isLoading={selectedWidget ? widgetLoading[selectedWidget.id] : false}
                isConfigured={selectedWidget ? isWidgetConfigured(selectedWidget) : false}
                aggregationNeedsField={aggregationNeedsField}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Config Panel Component
interface ConfigPanelProps {
  widget: Widget | null;
  onDelete: () => void;
  onTitleChange: (title: string) => void;
  onConfigChange: (updates: Partial<Widget['config']>) => void;
  onConfigChangeAndRefresh: (updates: Partial<Widget['config']>) => void;
  onConnectionChange: (connectionId: string) => void;
  onTableChange: (table: string) => void;
  onRefresh: () => void;
  connections: Connection[];
  tables: TableInfo[];
  columns: ColumnInfo[];
  isLoading: boolean;
  isConfigured: boolean;
  aggregationNeedsField: boolean;
}

function ConfigPanel({
  widget,
  onDelete,
  onTitleChange,
  onConfigChange,
  onConfigChangeAndRefresh,
  onConnectionChange,
  onTableChange,
  onRefresh,
  connections,
  tables,
  columns,
  isLoading,
  isConfigured,
  aggregationNeedsField,
}: ConfigPanelProps) {
  if (!widget) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>Select a widget to configure</p>
      </div>
    );
  }

  return (
    <div>
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{WIDGET_ICONS[widget.type] || '📦'}</span>
            <div>
              <h3 className="font-semibold text-gray-900">Configure Widget</h3>
              <p className="text-xs text-gray-500">
                {widget.type === 'kpi' && 'KPI Card'}
                {widget.type === 'chart' && 'Chart'}
                {widget.type === 'table' && 'Data Table'}
                {widget.type === 'text' && 'Text'}
              </p>
            </div>
          </div>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
            title="Delete widget"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            type="text"
            value={widget.title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            placeholder="Widget title"
          />
        </div>

        {/* Text widget content */}
        {widget.type === 'text' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
            <textarea
              value={widget.config?.content || ''}
              onChange={(e) => onConfigChange({ content: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none"
              rows={4}
              placeholder="Enter text content..."
            />
          </div>
        )}

        {/* Data Source for non-text widgets */}
        {widget.type !== 'text' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Connection</label>
              <select
                value={widget.config?.connectionId || ''}
                onChange={(e) => onConnectionChange(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              >
                <option value="">Select connection...</option>
                {connections.map((conn) => (
                  <option key={conn.id} value={conn.id}>
                    {conn.name}
                  </option>
                ))}
              </select>
            </div>

            {widget.config?.connectionId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Table</label>
                <select
                  value={widget.config?.table || ''}
                  onChange={(e) => onTableChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                >
                  <option value="">Select table...</option>
                  {tables.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* KPI & Chart specific options */}
            {(widget.type === 'kpi' || widget.type === 'chart') && widget.config?.table && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Aggregation</label>
                  <select
                    value={widget.config?.aggregation || 'count'}
                    onChange={(e) =>
                      onConfigChangeAndRefresh({
                        aggregation: e.target.value as 'count' | 'sum' | 'avg' | 'min' | 'max',
                        field: undefined,
                      })
                    }
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  >
                    {AGGREGATION_TYPES.map((agg) => (
                      <option key={agg.id} value={agg.id}>
                        {agg.name}
                      </option>
                    ))}
                  </select>
                </div>

                {aggregationNeedsField && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Field</label>
                    <select
                      value={widget.config?.field || ''}
                      onChange={(e) => onConfigChangeAndRefresh({ field: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    >
                      <option value="">Select field...</option>
                      {columns
                        .filter((c) =>
                          ['integer', 'bigint', 'numeric', 'real', 'double precision', 'smallint', 'decimal', 'money'].includes(
                            c.type.toLowerCase()
                          )
                        )
                        .map((col) => (
                          <option key={col.name} value={col.name}>
                            {col.name} ({col.type})
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {widget.type === 'chart' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Group By <span className="text-danger-500">*</span>
                      </label>
                      <select
                        value={widget.config?.groupBy || ''}
                        onChange={(e) =>
                          onConfigChangeAndRefresh({
                            groupBy: e.target.value,
                            datePeriod: undefined,
                          })
                        }
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      >
                        <option value="">Select column...</option>
                        {columns.map((col) => (
                          <option key={col.name} value={col.name}>
                            {col.name} ({col.type})
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Required for charts. Groups data by this column.
                      </p>
                    </div>

                    {/* Date Period */}
                    {widget.config?.groupBy && (() => {
                      const groupByCol = columns.find((c) => c.name === widget.config?.groupBy);
                      const isDateColumn = groupByCol && DATE_TYPES.includes(groupByCol.type.toLowerCase());
                      if (!isDateColumn) return null;
                      return (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Agrupar por período
                          </label>
                          <select
                            value={widget.config?.datePeriod || ''}
                            onChange={(e) =>
                              onConfigChangeAndRefresh({
                                datePeriod: (e.target.value as 'day' | 'week' | 'month' | 'year') || undefined,
                              })
                            }
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                          >
                            {DATE_PERIODS.map((period) => (
                              <option key={period.id} value={period.id}>
                                {period.name}
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-gray-500 mt-1">
                            Agrupa datas por dia, semana, mês ou ano.
                          </p>
                        </div>
                      );
                    })()}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Chart Type</label>
                      <div className="grid grid-cols-2 gap-2">
                        {CHART_TYPES.map((chart) => (
                          <button
                            key={chart.id}
                            type="button"
                            onClick={() =>
                              onConfigChange({
                                chartType: chart.id as 'bar' | 'line' | 'pie' | 'area',
                              })
                            }
                            className={`p-2 text-sm rounded-lg border-2 transition-all ${
                              widget.config?.chartType === chart.id
                                ? 'border-primary-500 bg-primary-50 text-primary-700'
                                : 'border-gray-200 hover:border-gray-300 text-gray-700'
                            }`}
                          >
                            {chart.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* Refresh Preview Button */}
        {widget.type !== 'text' && isConfigured && (
          <div className="pt-4 border-t border-gray-100">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm font-medium"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Loading...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Preview
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
