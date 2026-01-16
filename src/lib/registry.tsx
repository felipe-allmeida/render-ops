'use client';

import React from 'react';
import { useDataValue, useSetData } from '@/components/providers/data-provider';
import { cn } from '@/lib/utils';

// Types for registry components
interface ElementProps {
  element: {
    type: string;
    props: Record<string, unknown>;
    children?: unknown[];
  };
  children?: React.ReactNode;
  onAction: (action: unknown) => void;
}

// ============================================================================
// ICONS - Reusable SVG icons
// ============================================================================
const Icons = {
  search: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  x: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  plus: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  ),
  refresh: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  edit: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  ),
  trash: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  ),
  filter: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  ),
  check: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  document: (
    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  chevronDown: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  ),
  chevronLeft: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  ),
  chevronRight: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  ),
  chevronsLeft: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
    </svg>
  ),
  chevronsRight: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
    </svg>
  ),
};

// Icon mapping for Button component
const iconMap: Record<string, React.ReactNode> = {
  plus: Icons.plus,
  refresh: Icons.refresh,
  search: Icons.search,
  filter: Icons.filter,
  edit: Icons.edit,
  trash: Icons.trash,
  x: Icons.x,
  check: Icons.check,
};

// ============================================================================
// LAYOUT COMPONENTS
// ============================================================================

// Page Component
const Page: React.FC<ElementProps> = ({ element, children }) => {
  const { title, subtitle } = element.props as { title: string; subtitle?: string };
  return (
    <div className="min-h-screen bg-gray-50/50">
      <header className="bg-white border-b border-gray-100 px-6 py-5">
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </header>
      <main className="p-6 max-w-7xl mx-auto">{children}</main>
    </div>
  );
};

// Section Component
const Section: React.FC<ElementProps> = ({ element, children }) => {
  const { title, collapsible, defaultCollapsed } = element.props as {
    title?: string;
    collapsible?: boolean;
    defaultCollapsed?: boolean;
  };
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed ?? false);

  return (
    <section className="mb-6">
      {title && (
        <div
          className={cn(
            'flex items-center justify-between mb-4',
            collapsible && 'cursor-pointer select-none'
          )}
          onClick={() => collapsible && setCollapsed(!collapsed)}
        >
          <h2 className="text-base font-semibold text-gray-800">{title}</h2>
          {collapsible && (
            <span className={cn('text-gray-400 transition-transform', collapsed && '-rotate-90')}>
              {Icons.chevronDown}
            </span>
          )}
        </div>
      )}
      {!collapsed && children}
    </section>
  );
};

// Card Component
const Card: React.FC<ElementProps> = ({ element, children }) => {
  const { title, subtitle, padding = 'md' } = element.props as {
    title?: string;
    subtitle?: string;
    padding?: 'none' | 'sm' | 'md' | 'lg';
  };

  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
      {(title || subtitle) && (
        <div className="px-5 py-4 border-b border-gray-100">
          {title && <h3 className="font-semibold text-gray-900">{title}</h3>}
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      )}
      <div className={paddingClasses[padding]}>{children}</div>
    </div>
  );
};

// Row Component
const Row: React.FC<ElementProps> = ({ element, children }) => {
  const { gap = 'md', align = 'center', justify = 'start', wrap, className } = element.props as {
    gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg';
    align?: 'start' | 'center' | 'end' | 'stretch';
    justify?: 'start' | 'center' | 'end' | 'between' | 'around';
    wrap?: boolean;
    className?: string;
  };

  const gapClasses = { none: 'gap-0', xs: 'gap-1', sm: 'gap-2', md: 'gap-3', lg: 'gap-4' };
  const alignClasses = { start: 'items-start', center: 'items-center', end: 'items-end', stretch: 'items-stretch' };
  const justifyClasses = { start: 'justify-start', center: 'justify-center', end: 'justify-end', between: 'justify-between', around: 'justify-around' };

  return (
    <div className={cn('flex', gapClasses[gap], alignClasses[align], justifyClasses[justify], wrap && 'flex-wrap', className)}>
      {children}
    </div>
  );
};

// ============================================================================
// DATA DISPLAY COMPONENTS
// ============================================================================

// Column visibility icon
const ColumnsIcon = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" />
  </svg>
);

// Table Component - Enhanced with Pagination and Column Toggle
const Table: React.FC<ElementProps> = ({ element, onAction }) => {
  const {
    columns,
    dataPath,
    rowKey,
    emptyMessage,
    rowActions,
    loadingPath,
    paginationPath,
    onPageChange,
    enableColumnToggle = false,
    defaultVisibleColumns = 6,
  } = element.props as {
    columns: Array<{ key: string; label: string; type?: string; width?: string }>;
    dataPath: string;
    rowKey: string;
    emptyMessage?: string;
    rowActions?: Array<{ name: string; params?: Record<string, unknown>; confirm?: unknown }>;
    loadingPath?: string;
    paginationPath?: string;
    onPageChange?: Record<string, unknown>;
    enableColumnToggle?: boolean;
    defaultVisibleColumns?: number;
  };

  const data = useDataValue(dataPath) as Array<Record<string, unknown>> | undefined;
  const isLoading = useDataValue(loadingPath || '/ui/isLoading');
  const pagination = useDataValue(paginationPath || '/data/pagination') as {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  } | undefined;

  // Column visibility state
  const [visibleColumnKeys, setVisibleColumnKeys] = React.useState<Set<string>>(() => {
    // By default, show first N columns
    const initialVisible = new Set<string>();
    columns.slice(0, defaultVisibleColumns).forEach(col => initialVisible.add(col.key));
    return initialVisible;
  });
  const [showColumnMenu, setShowColumnMenu] = React.useState(false);

  // Filtered columns based on visibility
  const visibleColumns = enableColumnToggle
    ? columns.filter(col => visibleColumnKeys.has(col.key))
    : columns;

  const toggleColumn = (key: string) => {
    setVisibleColumnKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        // Don't allow hiding all columns
        if (next.size > 1) {
          next.delete(key);
        }
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const showAllColumns = () => {
    setVisibleColumnKeys(new Set(columns.map(col => col.key)));
  };

  const hideAllColumns = () => {
    // Keep at least the first column
    setVisibleColumnKeys(new Set([columns[0]?.key].filter(Boolean)));
  };

  const formatValue = (value: unknown, type?: string): string => {
    if (value === null || value === undefined) return '—';
    if (type === 'boolean') return value ? 'Yes' : 'No';
    if (type === 'date' && value) {
      return new Date(value as string).toLocaleDateString('pt-BR');
    }
    if (type === 'currency' && typeof value === 'number') {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    }
    return String(value);
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (onPageChange) {
      const actionWithPage = {
        ...onPageChange,
        params: {
          ...(onPageChange.params as Record<string, unknown>),
          page: newPage,
        },
      };
      onAction(actionWithPage);
    }
  };

  // Pagination info
  const currentPage = pagination?.page || 1;
  const totalPages = pagination?.totalPages || 1;
  const total = pagination?.total || 0;
  const limit = pagination?.limit || 20;
  const startRecord = total > 0 ? (currentPage - 1) * limit + 1 : 0;
  const endRecord = Math.min(currentPage * limit, total);

  // Column toggle header component
  const ColumnToggleHeader = enableColumnToggle && columns.length > 0 && (
    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-white">
      <div className="text-sm text-gray-500">
        Showing <span className="font-medium text-gray-700">{visibleColumns.length}</span> of{' '}
        <span className="font-medium text-gray-700">{columns.length}</span> columns
      </div>
      <button
        onClick={() => setShowColumnMenu(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-all"
      >
        {ColumnsIcon}
        <span>Columns</span>
      </button>
    </div>
  );

  // Column settings drawer (slide-out panel)
  const ColumnDrawer = enableColumnToggle && showColumnMenu && (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm animate-fade-in"
        onClick={() => setShowColumnMenu(false)}
      />

      {/* Drawer panel */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-modal flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Table Columns</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {visibleColumns.length} of {columns.length} selected
            </p>
          </div>
          <button
            onClick={() => setShowColumnMenu(false)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {Icons.x}
          </button>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50/50">
          <button
            onClick={showAllColumns}
            className="flex-1 py-2 text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
          >
            Show all
          </button>
          <button
            onClick={hideAllColumns}
            className="flex-1 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Hide all
          </button>
        </div>

        {/* Column list */}
        <div className="flex-1 overflow-y-auto py-2">
          {columns.map((col, index) => (
            <label
              key={col.key}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={visibleColumnKeys.has(col.key)}
                onChange={() => toggleColumn(col.key)}
                className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 focus:ring-offset-0"
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-900">{col.label}</span>
                <span className="text-xs text-gray-400 ml-2">#{index + 1}</span>
              </div>
              {visibleColumnKeys.has(col.key) && (
                <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded">
                  visible
                </span>
              )}
            </label>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={() => setShowColumnMenu(false)}
            className="w-full py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="overflow-hidden">
        {ColumnToggleHeader}
        <div className="overflow-auto max-h-[calc(100vh-320px)]">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-gray-100 bg-gray-50">
                {visibleColumns.map((col) => (
                  <th key={col.key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {col.label}
                  </th>
                ))}
                {rowActions && <th className="px-4 py-3 w-24"></th>}
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="border-b border-gray-50">
                  {visibleColumns.map((col) => (
                    <td key={col.key} className="px-4 py-4">
                      <div className="h-4 skeleton rounded w-3/4" />
                    </td>
                  ))}
                  {rowActions && (
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <div className="h-8 w-8 skeleton rounded-lg" />
                        <div className="h-8 w-8 skeleton rounded-lg" />
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-400">
          {Icons.document}
        </div>
        <h3 className="text-base font-medium text-gray-900 mb-1">No records found</h3>
        <p className="text-sm text-gray-500 max-w-sm mx-auto">
          {emptyMessage || 'Get started by creating your first record.'}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      {/* Column toggle header */}
      {ColumnToggleHeader}

      {/* Desktop table */}
      <div className="hidden md:block overflow-auto max-h-[calc(100vh-320px)]">
        <table className="w-full">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-gray-100 bg-gray-50">
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.label}
                </th>
              ))}
              {rowActions && rowActions.length > 0 && (
                <th className="px-4 py-3 w-28 text-right text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50/95 backdrop-blur-sm">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map((row, idx) => (
              <tr key={String(row[rowKey]) || idx} className="table-row-hover">
                {visibleColumns.map((col) => (
                  <td key={col.key} className="px-4 py-3.5 text-sm text-gray-700 whitespace-nowrap">
                    {formatValue(row[col.key], col.type)}
                  </td>
                ))}
                {rowActions && rowActions.length > 0 && (
                  <td className="px-4 py-3 sticky right-0 bg-white/95 backdrop-blur-sm">
                    <div className="flex items-center justify-end gap-1">
                      {rowActions.map((action, actionIdx) => (
                        <button
                          key={actionIdx}
                          className={cn(
                            'action-btn text-gray-400',
                            action.name === 'db_get' && 'action-btn-edit',
                            action.name === 'db_delete' && 'action-btn-delete'
                          )}
                          onClick={() =>
                            onAction({
                              ...action,
                              params: { ...action.params, id: row[rowKey], row },
                            })
                          }
                          title={action.name === 'db_get' ? 'Edit' : 'Delete'}
                        >
                          {action.name === 'db_get' && Icons.edit}
                          {action.name === 'db_delete' && Icons.trash}
                        </button>
                      ))}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden divide-y divide-gray-100 overflow-auto max-h-[calc(100vh-320px)]">
        {data.map((row, idx) => (
          <div key={String(row[rowKey]) || idx} className="p-4">
            <div className="space-y-2">
              {visibleColumns.slice(0, 4).map((col) => (
                <div key={col.key} className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 uppercase">{col.label}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatValue(row[col.key], col.type)}
                  </span>
                </div>
              ))}
            </div>
            {rowActions && rowActions.length > 0 && (
              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                {rowActions.map((action, actionIdx) => (
                  <button
                    key={actionIdx}
                    className={cn(
                      'flex-1 py-2 px-3 text-sm font-medium rounded-lg flex items-center justify-center gap-2',
                      action.name === 'db_get' && 'bg-primary-50 text-primary-700 hover:bg-primary-100',
                      action.name === 'db_delete' && 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    )}
                    onClick={() =>
                      onAction({
                        ...action,
                        params: { ...action.params, id: row[rowKey], row },
                      })
                    }
                  >
                    {action.name === 'db_get' && <>{Icons.edit}<span>Edit</span></>}
                    {action.name === 'db_delete' && <>{Icons.trash}<span>Delete</span></>}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {pagination && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-gray-100 bg-gray-50/50">
          {/* Info */}
          <div className="text-sm text-gray-500 order-2 sm:order-1">
            Showing <span className="font-medium text-gray-700">{startRecord}</span> to{' '}
            <span className="font-medium text-gray-700">{endRecord}</span> of{' '}
            <span className="font-medium text-gray-700">{total}</span> results
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1 order-1 sm:order-2">
            {/* First page */}
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className={cn(
                'p-2 rounded-lg transition-colors',
                currentPage === 1
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              )}
              title="First page"
            >
              {Icons.chevronsLeft}
            </button>

            {/* Previous page */}
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={cn(
                'p-2 rounded-lg transition-colors',
                currentPage === 1
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              )}
              title="Previous page"
            >
              {Icons.chevronLeft}
            </button>

            {/* Page numbers */}
            <div className="flex items-center gap-1 mx-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={cn(
                      'min-w-[36px] h-9 px-3 text-sm font-medium rounded-lg transition-colors',
                      currentPage === pageNum
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            {/* Next page */}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={cn(
                'p-2 rounded-lg transition-colors',
                currentPage === totalPages
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              )}
              title="Next page"
            >
              {Icons.chevronRight}
            </button>

            {/* Last page */}
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className={cn(
                'p-2 rounded-lg transition-colors',
                currentPage === totalPages
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              )}
              title="Last page"
            >
              {Icons.chevronsRight}
            </button>
          </div>
        </div>
      )}

      {/* Column settings drawer */}
      {ColumnDrawer}
    </div>
  );
};

// SearchFilter Component - Enhanced
const SearchFilter: React.FC<ElementProps> = ({ element, onAction }) => {
  const {
    searchPath,
    searchPlaceholder = 'Search...',
    filters = [],
    onSearch,
  } = element.props as {
    searchPath: string;
    searchPlaceholder?: string;
    filters?: Array<{
      key: string;
      label: string;
      type: 'text' | 'select' | 'date';
      options?: Array<{ value: string; label: string }>;
    }>;
    onSearch: Record<string, unknown>;
  };

  const searchValue = useDataValue(searchPath) || '';
  const setData = useSetData();
  const [localSearch, setLocalSearch] = React.useState(String(searchValue));
  const [showFilters, setShowFilters] = React.useState(false);
  const [activeFilterCount, setActiveFilterCount] = React.useState(0);
  const filterValuesRef = React.useRef<Record<string, string>>({});

  // Calculate active filter count
  React.useEffect(() => {
    let count = localSearch ? 1 : 0;
    count += Object.values(filterValuesRef.current).filter(v => v && v.trim()).length;
    setActiveFilterCount(count);
  }, [localSearch]);

  // Execute search with current values
  const executeSearch = React.useCallback((searchTerm: string, filterValues: Record<string, string>) => {
    if (onSearch) {
      // Build the action with current values directly injected
      const actionWithValues = {
        ...onSearch,
        params: {
          ...(onSearch.params as Record<string, unknown>),
          search: searchTerm,
          filters: { ...filterValues, search: searchTerm },
        },
      };
      onAction(actionWithValues);
    }
  }, [onSearch, onAction]);

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchValue) {
        setData(searchPath, localSearch);
        executeSearch(localSearch, filterValuesRef.current);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [localSearch, searchValue, searchPath, setData, executeSearch]);

  const handleFilterChange = (key: string, value: string) => {
    filterValuesRef.current[key] = value;
    setData(`/filters/${key}`, value || null);
    executeSearch(localSearch, filterValuesRef.current);
  };

  const handleClear = () => {
    setLocalSearch('');
    setData(searchPath, '');
    filters.forEach((f) => {
      setData(`/filters/${f.key}`, null);
      filterValuesRef.current[f.key] = '';
    });
    filterValuesRef.current = {};
    executeSearch('', {});
  };

  return (
    <div className="p-4 bg-gray-50/80 border-b border-gray-100">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search input */}
        <div className="flex-1 min-w-0">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              {Icons.search}
            </div>
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className={cn(
                'w-full pl-10 pr-10 py-2.5 text-sm rounded-lg border transition-all',
                'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
                localSearch
                  ? 'border-primary-200 bg-primary-50/50'
                  : 'border-gray-200 bg-white'
              )}
            />
            {localSearch && (
              <button
                onClick={() => {
                  setLocalSearch('');
                  setData(searchPath, '');
                  executeSearch('', filterValuesRef.current);
                }}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {Icons.x}
              </button>
            )}
          </div>
        </div>

        {/* Mobile filter toggle */}
        {filters.length > 0 && (
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'sm:hidden flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all',
              showFilters
                ? 'border-primary-200 bg-primary-50 text-primary-700'
                : 'border-gray-200 bg-white text-gray-700'
            )}
          >
            {Icons.filter}
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="bg-primary-600 text-white text-xs font-semibold px-1.5 py-0.5 rounded-full min-w-[20px]">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}

        {/* Filter fields */}
        <div className={cn(
          'flex flex-col sm:flex-row gap-3',
          filters.length > 0 && !showFilters && 'hidden sm:flex'
        )}>
          {filters.map((filter) => (
            <div key={filter.key} className="min-w-[140px]">
              {filter.type === 'select' && filter.options ? (
                <select
                  onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                >
                  <option value="">{filter.label}</option>
                  {filter.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={filter.type === 'date' ? 'date' : 'text'}
                  onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                  placeholder={filter.label}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              )}
            </div>
          ))}
        </div>

        {/* Clear button */}
        {(localSearch || activeFilterCount > 0) && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-gray-500 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
          >
            {Icons.x}
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// FORM COMPONENTS
// ============================================================================

// Form Component
const Form: React.FC<ElementProps> = ({ element, children, onAction }) => {
  const { id, dataPath, onSubmit } = element.props as {
    id?: string;
    dataPath: string;
    onSubmit?: unknown;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      onAction(onSubmit);
    }
  };

  return (
    <form id={id} onSubmit={handleSubmit} className="space-y-4">
      {children}
    </form>
  );
};

// TextField Component - Enhanced
const TextField: React.FC<ElementProps> = ({ element }) => {
  const {
    label,
    valuePath,
    placeholder,
    disabled,
    required,
    type = 'text',
    multiline,
    rows = 3,
  } = element.props as {
    label: string;
    valuePath: string;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    type?: string;
    multiline?: boolean;
    rows?: number;
  };

  const value = useDataValue(valuePath) ?? '';
  const setData = useSetData();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setData(valuePath, e.target.value);
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-danger-500 ml-0.5">*</span>}
      </label>
      {multiline ? (
        <textarea
          value={String(value)}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          rows={rows}
          className="input-base resize-none"
        />
      ) : (
        <input
          type={type}
          value={String(value)}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className="input-base"
        />
      )}
    </div>
  );
};

// NumberField Component - Enhanced
const NumberField: React.FC<ElementProps> = ({ element }) => {
  const {
    label,
    valuePath,
    placeholder,
    disabled,
    required,
    min,
    max,
    step,
    prefix,
    suffix,
  } = element.props as {
    label: string;
    valuePath: string;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    min?: number;
    max?: number;
    step?: number;
    prefix?: string;
    suffix?: string;
  };

  const value = useDataValue(valuePath) ?? '';
  const setData = useSetData();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === '' ? null : Number(e.target.value);
    setData(valuePath, val);
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-danger-500 ml-0.5">*</span>}
      </label>
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3 text-gray-500 text-sm pointer-events-none">{prefix}</span>
        )}
        <input
          type="number"
          value={value === null ? '' : String(value)}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          min={min}
          max={max}
          step={step}
          className={cn('input-base', prefix && 'pl-10', suffix && 'pr-10')}
        />
        {suffix && (
          <span className="absolute right-3 text-gray-500 text-sm pointer-events-none">{suffix}</span>
        )}
      </div>
    </div>
  );
};

// DateField Component
const DateField: React.FC<ElementProps> = ({ element }) => {
  const { label, valuePath, placeholder, disabled, required, includeTime } = element.props as {
    label: string;
    valuePath: string;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    includeTime?: boolean;
  };

  const value = useDataValue(valuePath) ?? '';
  const setData = useSetData();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setData(valuePath, e.target.value || null);
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-danger-500 ml-0.5">*</span>}
      </label>
      <input
        type={includeTime ? 'datetime-local' : 'date'}
        value={String(value)}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className="input-base"
      />
    </div>
  );
};

// SelectField Component
const SelectField: React.FC<ElementProps> = ({ element }) => {
  const { label, valuePath, options, placeholder, disabled, required } = element.props as {
    label: string;
    valuePath: string;
    options: Array<{ value: string | number | boolean; label: string }>;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
  };

  const value = useDataValue(valuePath) ?? '';
  const setData = useSetData();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOption = options.find((opt) => String(opt.value) === e.target.value);
    setData(valuePath, selectedOption?.value ?? null);
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-danger-500 ml-0.5">*</span>}
      </label>
      <select
        value={String(value)}
        onChange={handleChange}
        disabled={disabled}
        required={required}
        className="input-base"
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={String(opt.value)} value={String(opt.value)}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};

// ============================================================================
// ACTION COMPONENTS
// ============================================================================

// Button Component - Enhanced with icons
const Button: React.FC<ElementProps> = ({ element, onAction }) => {
  const {
    label,
    action,
    variant = 'primary',
    size = 'md',
    disabled,
    loading,
    icon,
  } = element.props as {
    label: string;
    action: unknown;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    icon?: string;
  };

  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    ghost: 'btn-ghost',
  };

  const sizeClasses = {
    sm: 'btn-sm',
    md: 'btn-md',
    lg: 'btn-lg',
  };

  return (
    <button
      type="button"
      onClick={() => onAction(action)}
      disabled={disabled || loading}
      className={cn('btn', variantClasses[variant], sizeClasses[size])}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon && iconMap[icon] ? (
        <span className="w-4 h-4">{iconMap[icon]}</span>
      ) : null}
      {label}
    </button>
  );
};

// ============================================================================
// FEEDBACK COMPONENTS
// ============================================================================

// Alert Component - Enhanced with icons and auto-dismiss
const Alert: React.FC<ElementProps> = ({ element }) => {
  const { message, messagePath, variant = 'info', dismissible, autoDismiss = true } = element.props as {
    message?: string;
    messagePath?: string;
    variant?: 'info' | 'success' | 'warning' | 'error';
    dismissible?: boolean;
    autoDismiss?: boolean;
  };

  const dataMessage = useDataValue(messagePath || '');
  const setData = useSetData();
  const displayMessage = messagePath ? dataMessage : message;

  // Auto-dismiss for success messages
  React.useEffect(() => {
    if (variant === 'success' && autoDismiss && displayMessage && messagePath) {
      const timer = setTimeout(() => {
        setData(messagePath, null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [displayMessage, variant, autoDismiss, messagePath]);

  if (!displayMessage) return null;

  const variantConfig = {
    info: { bg: 'bg-primary-50', border: 'border-primary-200', text: 'text-primary-700', icon: Icons.info },
    success: { bg: 'bg-success-50', border: 'border-success-200', text: 'text-success-700', icon: Icons.check },
    warning: { bg: 'bg-warning-50', border: 'border-warning-200', text: 'text-warning-700', icon: Icons.warning },
    error: { bg: 'bg-danger-50', border: 'border-danger-200', text: 'text-danger-700', icon: Icons.error },
  };

  const config = variantConfig[variant];

  const handleDismiss = () => {
    if (messagePath) {
      setData(messagePath, null);
    }
  };

  return (
    <div className={cn('px-4 py-3 rounded-lg border flex items-start gap-3 mb-4 animate-fade-in', config.bg, config.border)}>
      <span className={cn('flex-shrink-0 mt-0.5', config.text)}>{config.icon}</span>
      <p className={cn('flex-1 text-sm', config.text)}>{String(displayMessage)}</p>
      {dismissible && (
        <button onClick={handleDismiss} className={cn('flex-shrink-0 opacity-70 hover:opacity-100', config.text)}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

// Toast Component
const Toast: React.FC<ElementProps> = ({ element }) => {
  const { message, variant = 'info' } = element.props as {
    message: string;
    variant?: 'info' | 'success' | 'warning' | 'error';
  };

  const variantClasses = {
    info: 'bg-primary-600',
    success: 'bg-success-600',
    warning: 'bg-warning-500',
    error: 'bg-danger-600',
  };

  return (
    <div className={cn('fixed bottom-4 right-4 px-4 py-3 rounded-lg text-white shadow-elevated toast-enter', variantClasses[variant])}>
      {message}
    </div>
  );
};

// ============================================================================
// MODAL COMPONENTS
// ============================================================================

// ModalConfirm Component - Enhanced
const ModalConfirm: React.FC<ElementProps> = ({ element, onAction }) => {
  const {
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'default',
    onConfirm,
    openPath,
    errorPath,
  } = element.props as {
    id: string;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'default' | 'danger' | 'warning';
    onConfirm: unknown;
    openPath: string;
    errorPath?: string;
  };

  const isOpen = useDataValue(openPath);
  const errorMessageRaw = useDataValue(errorPath || '');
  const errorMessage = errorMessageRaw ? String(errorMessageRaw) : null;
  const setData = useSetData();

  if (!isOpen) return null;

  const confirmButtonClasses = {
    default: 'btn-primary',
    danger: 'btn-danger',
    warning: 'bg-warning-500 text-white hover:bg-warning-600 focus:ring-warning-500',
  };

  const handleClose = () => {
    setData(openPath, false);
    if (errorPath) setData(errorPath, null);
  };

  const handleConfirm = () => {
    if (errorPath) setData(errorPath, null);
    onAction(onConfirm);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={handleClose} />
        <div className="relative bg-white rounded-2xl shadow-modal max-w-md w-full p-6 modal-enter">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          {errorMessage && (
            <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg flex items-start gap-2">
              <span className="text-danger-500 flex-shrink-0">{Icons.error}</span>
              <p className="text-sm text-danger-700">{errorMessage}</p>
            </div>
          )}
          <p className="text-gray-600 mb-6">{message}</p>
          <div className="flex justify-end gap-3">
            <button onClick={handleClose} className="btn btn-secondary btn-md">
              {cancelLabel}
            </button>
            <button onClick={handleConfirm} className={cn('btn btn-md', confirmButtonClasses[variant])}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// FormModal Component - Enhanced
const FormModal: React.FC<ElementProps> = ({ element, children, onAction }) => {
  const {
    title,
    openPath,
    errorPath,
    confirmLabel = 'Save',
    cancelLabel = 'Cancel',
    variant = 'default',
    onConfirm,
  } = element.props as {
    title: string;
    openPath: string;
    errorPath?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'default' | 'danger' | 'warning';
    onConfirm: unknown;
  };

  const isOpen = useDataValue(openPath);
  const errorMessageRaw = useDataValue(errorPath || '');
  const errorMessage = errorMessageRaw ? String(errorMessageRaw) : null;
  const setData = useSetData();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  if (!isOpen) return null;

  const confirmButtonClasses = {
    default: 'btn-primary',
    danger: 'btn-danger',
    warning: 'bg-warning-500 text-white hover:bg-warning-600 focus:ring-warning-500',
  };

  const handleClose = () => {
    setData(openPath, false);
    if (errorPath) setData(errorPath, null);
  };

  const handleConfirm = async () => {
    if (errorPath) setData(errorPath, null);
    setIsSubmitting(true);
    try {
      await onAction(onConfirm);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={handleClose} />
        <div className="relative bg-white rounded-2xl shadow-modal max-w-lg w-full max-h-[90vh] flex flex-col modal-enter">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button
              onClick={handleClose}
              className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {Icons.x}
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 overflow-y-auto flex-1">
            {errorMessage && (
              <div className="mb-4 p-4 bg-danger-50 border border-danger-200 rounded-lg flex items-start gap-3">
                <span className="text-danger-500 flex-shrink-0 mt-0.5">{Icons.error}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-danger-700 break-words">{errorMessage}</p>
                </div>
                <button
                  onClick={() => errorPath && setData(errorPath, null)}
                  className="text-danger-400 hover:text-danger-600 flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            <div className="space-y-4">{children}</div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
            <button onClick={handleClose} disabled={isSubmitting} className="btn btn-secondary btn-md">
              {cancelLabel}
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className={cn('btn btn-md', confirmButtonClasses[variant])}
            >
              {isSubmitting && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {isSubmitting ? 'Saving...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================

// Spacer Component
const Spacer: React.FC<ElementProps> = ({ element }) => {
  const { size = 'md' } = element.props as { size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' };
  const sizeClasses = { xs: 'h-1', sm: 'h-2', md: 'h-4', lg: 'h-6', xl: 'h-8' };
  return <div className={sizeClasses[size]} />;
};

// Divider Component
const Divider: React.FC<ElementProps> = ({ element }) => {
  const { orientation = 'horizontal' } = element.props as { orientation?: 'horizontal' | 'vertical' };
  if (orientation === 'vertical') {
    return <div className="w-px bg-gray-200 self-stretch" />;
  }
  return <hr className="border-t border-gray-100 my-4" />;
};

// Skeleton Component - For loading states
const Skeleton: React.FC<ElementProps> = ({ element }) => {
  const { variant = 'text', width, height, count = 1, className } = element.props as {
    variant?: 'text' | 'circle' | 'rect' | 'row';
    width?: string;
    height?: string;
    count?: number;
    className?: string;
  };

  const baseClasses = 'skeleton rounded';

  const variantClasses = {
    text: 'h-4 w-3/4',
    circle: 'rounded-full w-10 h-10',
    rect: 'h-20 w-full',
    row: 'h-12 w-full',
  };

  const items = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={cn(baseClasses, variantClasses[variant], className)}
      style={{
        width: width || undefined,
        height: height || undefined,
      }}
    />
  ));

  if (count > 1) {
    return <div className="space-y-3">{items}</div>;
  }

  return items[0];
};

// EmptyState Component - For empty data states
const EmptyState: React.FC<ElementProps> = ({ element, onAction }) => {
  const {
    icon = 'document',
    title = 'No data',
    description,
    action,
    actionLabel
  } = element.props as {
    icon?: 'document' | 'search' | 'filter' | 'plus';
    title?: string;
    description?: string;
    action?: unknown;
    actionLabel?: string;
  };

  const iconElements: Record<string, React.ReactNode> = {
    document: Icons.document,
    search: (
      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    filter: (
      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
      </svg>
    ),
    plus: (
      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    ),
  };

  return (
    <div className="text-center py-12 px-4">
      <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-400">
        {iconElements[icon]}
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">{description}</p>
      )}
      {action !== undefined && actionLabel && (
        <button
          onClick={() => onAction(action)}
          className="btn btn-primary btn-md"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

// Badge Component - For status and counts
const Badge: React.FC<ElementProps> = ({ element }) => {
  const {
    content,
    valuePath,
    variant = 'default',
    size = 'md',
    dot = false,
  } = element.props as {
    content?: string | number;
    valuePath?: string;
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
    size?: 'sm' | 'md';
    dot?: boolean;
  };

  const dataValue = useDataValue(valuePath || '');
  const rawContent = content ?? dataValue;
  const displayContent = rawContent != null ? String(rawContent) : null;

  const variantClasses = {
    default: 'bg-gray-100 text-gray-700',
    primary: 'bg-primary-100 text-primary-700',
    success: 'bg-success-100 text-success-700',
    warning: 'bg-warning-100 text-warning-700',
    danger: 'bg-danger-100 text-danger-700',
  };

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-0.5 text-sm',
  };

  if (dot) {
    const dotColors = {
      default: 'bg-gray-400',
      primary: 'bg-primary-500',
      success: 'bg-success-500',
      warning: 'bg-warning-500',
      danger: 'bg-danger-500',
    };

    return (
      <span className="inline-flex items-center gap-1.5">
        <span className={cn('w-2 h-2 rounded-full', dotColors[variant])} />
        {displayContent && <span className="text-sm text-gray-700">{displayContent}</span>}
      </span>
    );
  }

  if (!displayContent) return null;

  return (
    <span className={cn(
      'inline-flex items-center font-medium rounded-full',
      variantClasses[variant],
      sizeClasses[size]
    )}>
      {displayContent}
    </span>
  );
};

// Text Component
const Text: React.FC<ElementProps> = ({ element }) => {
  const { content, valuePath, variant = 'body', color = 'default' } = element.props as {
    content?: string;
    valuePath?: string;
    variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'code';
    color?: 'default' | 'muted' | 'primary' | 'success' | 'warning' | 'error';
  };

  const dataValue = useDataValue(valuePath || '');
  const displayText = content || (dataValue !== undefined ? String(dataValue) : '');

  const variantClasses = {
    h1: 'text-2xl font-bold',
    h2: 'text-xl font-semibold',
    h3: 'text-lg font-medium',
    body: 'text-base',
    caption: 'text-sm',
    code: 'font-mono text-sm bg-gray-100 px-1.5 py-0.5 rounded',
  };

  const colorClasses = {
    default: 'text-gray-900',
    muted: 'text-gray-500',
    primary: 'text-primary-600',
    success: 'text-success-600',
    warning: 'text-warning-600',
    error: 'text-danger-600',
  };

  return <span className={cn(variantClasses[variant], colorClasses[color])}>{displayText}</span>;
};

// ============================================================================
// REGISTRY EXPORT
// ============================================================================

export const registry: Record<string, React.FC<ElementProps>> = {
  Page,
  Section,
  Card,
  Row,
  Table,
  SearchFilter,
  Form,
  TextField,
  NumberField,
  DateField,
  SelectField,
  Button,
  Alert,
  Toast,
  ModalConfirm,
  FormModal,
  Spacer,
  Divider,
  Text,
  Skeleton,
  EmptyState,
  Badge,
};
