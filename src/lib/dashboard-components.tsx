'use client';

import React from 'react';
import {
  BarChart as RechartsBar,
  Bar,
  LineChart as RechartsLine,
  Line,
  PieChart as RechartsPie,
  Pie,
  AreaChart as RechartsArea,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ResponsiveContainer,
} from 'recharts';

// Color palette for charts
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

// Types
export interface Widget {
  id: string;
  type: 'kpi' | 'chart' | 'table' | 'text';
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  config?: {
    connectionId?: string;
    query?: string;
    table?: string;
    aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max';
    field?: string;
    groupBy?: string;
    datePeriod?: 'day' | 'week' | 'month' | 'year';
    chartType?: 'bar' | 'line' | 'pie' | 'area';
    xAxis?: string;
    yAxis?: string;
    content?: string;
  };
}

interface DashboardGridProps {
  widgets: Widget[];
  columns?: number;
  rowHeight?: number;
  children?: React.ReactNode;
  onWidgetClick?: (widget: Widget) => void;
}

// Dashboard Grid Component
export function DashboardGrid({
  widgets,
  columns = 12,
  rowHeight = 80,
  children,
  onWidgetClick,
}: DashboardGridProps) {
  const maxY = widgets.reduce((max, w) => Math.max(max, w.y + w.height), 0);
  const gridHeight = maxY * rowHeight;

  return (
    <div
      className="relative w-full"
      style={{
        minHeight: gridHeight || 400,
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gridAutoRows: `${rowHeight}px`,
        gap: '16px',
        padding: '16px',
      }}
    >
      {widgets.map((widget) => (
        <div
          key={widget.id}
          className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
          style={{
            gridColumn: `${widget.x + 1} / span ${widget.width}`,
            gridRow: `${widget.y + 1} / span ${widget.height}`,
          }}
          onClick={() => onWidgetClick?.(widget)}
        >
          {children}
        </div>
      ))}
    </div>
  );
}

// KPI Card Component
interface KPICardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  icon?: React.ReactNode;
  loading?: boolean;
}

export function KPICard({ title, value, subtitle, trend, icon, loading }: KPICardProps) {
  if (loading) {
    return (
      <div className="h-full p-4 flex flex-col">
        <div className="h-4 w-24 skeleton rounded mb-2" />
        <div className="h-8 w-32 skeleton rounded mb-2" />
        <div className="h-3 w-20 skeleton rounded" />
      </div>
    );
  }

  const formatValue = (v: number | string) => {
    if (typeof v === 'number') {
      if (v >= 1000000) {
        return `${(v / 1000000).toFixed(1)}M`;
      }
      if (v >= 1000) {
        return `${(v / 1000).toFixed(1)}K`;
      }
      return v.toLocaleString();
    }
    return v;
  };

  return (
    <div className="h-full p-4 flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        {icon && <span className="text-gray-400">{icon}</span>}
      </div>
      <div>
        <div className="text-3xl font-bold text-gray-900">{formatValue(value)}</div>
        <div className="flex items-center gap-2 mt-1">
          {trend && (
            <span
              className={`text-sm font-medium flex items-center gap-0.5 ${
                trend.direction === 'up'
                  ? 'text-success-600'
                  : trend.direction === 'down'
                  ? 'text-danger-600'
                  : 'text-gray-500'
              }`}
            >
              {trend.direction === 'up' && (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              )}
              {trend.direction === 'down' && (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              )}
              {trend.value > 0 ? '+' : ''}{trend.value}%
            </span>
          )}
          {subtitle && <span className="text-sm text-gray-500">{subtitle}</span>}
        </div>
      </div>
    </div>
  );
}

// Bar Chart Component
interface ChartData {
  label: string;
  value: number;
  [key: string]: unknown;
}

interface BarChartWidgetProps {
  data: ChartData[];
  title?: string;
  xAxisKey?: string;
  yAxisKey?: string;
  loading?: boolean;
}

export function BarChartWidget({ data, title, xAxisKey = 'label', yAxisKey = 'value', loading }: BarChartWidgetProps) {
  if (loading) {
    return (
      <div className="h-full p-4 flex items-center justify-center">
        <div className="w-full h-32 skeleton rounded" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-full p-4 flex flex-col">
        {title && <h3 className="text-sm font-medium text-gray-700 mb-2">{title}</h3>}
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          No data available
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-4 flex flex-col">
      {title && <h3 className="text-sm font-medium text-gray-700 mb-2 flex-shrink-0">{title}</h3>}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBar
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey={xAxisKey} tick={{ fontSize: 11 }} stroke="#9ca3af" />
            <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              formatter={(value) => (value as number)?.toLocaleString?.() ?? value}
            />
            <Bar dataKey={yAxisKey} fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </RechartsBar>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Line Chart Component
interface LineChartWidgetProps {
  data: ChartData[];
  title?: string;
  xAxisKey?: string;
  yAxisKey?: string;
  loading?: boolean;
}

export function LineChartWidget({ data, title, xAxisKey = 'label', yAxisKey = 'value', loading }: LineChartWidgetProps) {
  if (loading) {
    return (
      <div className="h-full p-4 flex items-center justify-center">
        <div className="w-full h-32 skeleton rounded" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-full p-4 flex flex-col">
        {title && <h3 className="text-sm font-medium text-gray-700 mb-2">{title}</h3>}
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          No data available
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-4 flex flex-col">
      {title && <h3 className="text-sm font-medium text-gray-700 mb-2 flex-shrink-0">{title}</h3>}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsLine
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey={xAxisKey} tick={{ fontSize: 11 }} stroke="#9ca3af" />
            <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              formatter={(value) => (value as number)?.toLocaleString?.() ?? value}
            />
            <Line
              type="monotone"
              dataKey={yAxisKey}
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </RechartsLine>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Pie Chart Component
interface PieChartWidgetProps {
  data: ChartData[];
  title?: string;
  loading?: boolean;
}

export function PieChartWidget({ data, title, loading }: PieChartWidgetProps) {
  if (loading) {
    return (
      <div className="h-full p-4 flex items-center justify-center">
        <div className="w-24 h-24 skeleton rounded-full" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-full p-4 flex flex-col">
        {title && <h3 className="text-sm font-medium text-gray-700 mb-2">{title}</h3>}
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          No data available
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-3 flex flex-col">
      {title && <h3 className="text-sm font-medium text-gray-700 mb-1 flex-shrink-0">{title}</h3>}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPie>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="45%"
              innerRadius="40%"
              outerRadius="70%"
              paddingAngle={1}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                fontSize: 12,
              }}
              formatter={(value, name) => [(value as number)?.toLocaleString?.() ?? value, name]}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              wrapperStyle={{ fontSize: 10, paddingTop: 5 }}
              formatter={(value) => <span style={{ color: '#374151', fontSize: 10 }}>{value}</span>}
            />
          </RechartsPie>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Area Chart Component
interface AreaChartWidgetProps {
  data: ChartData[];
  title?: string;
  xAxisKey?: string;
  yAxisKey?: string;
  loading?: boolean;
}

export function AreaChartWidget({ data, title, xAxisKey = 'label', yAxisKey = 'value', loading }: AreaChartWidgetProps) {
  if (loading) {
    return (
      <div className="h-full p-4 flex items-center justify-center">
        <div className="w-full h-32 skeleton rounded" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-full p-4 flex flex-col">
        {title && <h3 className="text-sm font-medium text-gray-700 mb-2">{title}</h3>}
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          No data available
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-4 flex flex-col">
      {title && <h3 className="text-sm font-medium text-gray-700 mb-2 flex-shrink-0">{title}</h3>}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsArea
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
          >
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey={xAxisKey} tick={{ fontSize: 11 }} stroke="#9ca3af" />
            <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              formatter={(value) => (value as number)?.toLocaleString?.() ?? value}
            />
            <Area
              type="monotone"
              dataKey={yAxisKey}
              stroke="#3b82f6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorValue)"
            />
          </RechartsArea>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Table Widget Component
interface TableWidgetProps {
  data: Record<string, unknown>[];
  columns?: { key: string; label: string }[];
  title?: string;
  loading?: boolean;
}

export function TableWidget({ data, columns, title, loading }: TableWidgetProps) {
  const tableColumns = columns || (data.length > 0
    ? Object.keys(data[0]).map((key) => ({
        key,
        label: key.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      }))
    : []);

  if (loading) {
    return (
      <div className="h-full p-4">
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 skeleton rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {title && (
        <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <h3 className="text-sm font-medium text-gray-700">{title}</h3>
        </div>
      )}
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              {tableColumns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                {tableColumns.map((col) => (
                  <td key={col.key} className="px-4 py-2 text-sm text-gray-700 whitespace-nowrap">
                    {String(row[col.key] ?? '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            No data available
          </div>
        )}
      </div>
    </div>
  );
}

// Text Widget Component
interface TextWidgetProps {
  content: string;
  title?: string;
}

export function TextWidget({ content, title }: TextWidgetProps) {
  return (
    <div className="h-full p-4 flex flex-col">
      {title && <h3 className="text-sm font-medium text-gray-700 mb-2 flex-shrink-0">{title}</h3>}
      <div className="flex-1 text-sm text-gray-600 overflow-auto min-h-0">
        {content}
      </div>
    </div>
  );
}

// Widget Renderer - renders the appropriate component based on widget type
interface WidgetRendererProps {
  widget: Widget;
  data?: unknown;
  loading?: boolean;
}

export function WidgetRenderer({ widget, data, loading }: WidgetRendererProps) {
  const { type, title, config } = widget;

  switch (type) {
    case 'kpi':
      return (
        <KPICard
          title={title}
          value={typeof data === 'number' ? data : (typeof data === 'string' ? data : 0)}
          loading={loading}
        />
      );

    case 'chart':
      const chartData = Array.isArray(data) ? data : [];
      switch (config?.chartType) {
        case 'line':
          return <LineChartWidget data={chartData} title={title} loading={loading} />;
        case 'pie':
          return <PieChartWidget data={chartData} title={title} loading={loading} />;
        case 'area':
          return <AreaChartWidget data={chartData} title={title} loading={loading} />;
        case 'bar':
        default:
          return <BarChartWidget data={chartData} title={title} loading={loading} />;
      }

    case 'table':
      return (
        <TableWidget
          data={Array.isArray(data) ? data : []}
          title={title}
          loading={loading}
        />
      );

    case 'text':
      return <TextWidget content={config?.content || ''} title={title} />;

    default:
      return (
        <div className="h-full flex items-center justify-center text-gray-500">
          Unknown widget type: {type}
        </div>
      );
  }
}
