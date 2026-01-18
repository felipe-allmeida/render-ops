'use client';

import { useState, useEffect, useCallback } from 'react';
import { DataProvider, useData } from '@/components/providers/data-provider';
import { ActionProvider } from '@/components/providers/action-provider';
import { Renderer, UIElement } from '@/components/renderer';
import * as XLSX from 'xlsx';

interface DynamicUIProps {
  connectionId: string;
  tableName: string;
  readonly?: boolean;
}

export function DynamicUI({ connectionId, tableName, readonly = false }: DynamicUIProps) {
  const [ui, setUI] = useState<UIElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Generate UI on mount
  useEffect(() => {
    generateUI();
  }, [connectionId, tableName, readonly]);

  const generateUI = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/ui/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId,
          table: tableName,
          type: 'crud',
          readonly,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate UI');
      }

      setUI(result.ui);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <svg
            className="animate-spin h-10 w-10 text-blue-600 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <p className="text-gray-600">Generating UI for {tableName}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-6 max-w-md">
          <h3 className="font-semibold mb-2">Failed to generate UI</h3>
          <p className="text-sm">{error}</p>
          <button
            onClick={generateUI}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!ui) {
    return null;
  }

  return (
    <div className="min-h-full md:h-full flex flex-col">
      <DataProvider
        initialData={{
          data: { items: [] },
          form: {},
          ui: { isLoading: true },
          filters: {},
        }}
      >
        <DynamicUIContent
          ui={ui}
          connectionId={connectionId}
          tableName={tableName}
        />
      </DataProvider>
    </div>
  );
}

// Inner component that has access to DataProvider context
function DynamicUIContent({
  ui,
  connectionId,
  tableName,
}: {
  ui: UIElement;
  connectionId: string;
  tableName: string;
}) {
  const { setMultiple } = useData();

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setMultiple({ '/ui/isLoading': true });
      const response = await fetch('/api/actions/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'db_list',
          params: {
            connectionId,
            table: tableName,
            page: 1,
            limit: 20,
          },
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        setMultiple({
          '/data/items': result.data.items,
          '/data/pagination': result.data.pagination,
          '/ui/isLoading': false,
        });
      } else {
        setMultiple({ '/ui/isLoading': false });
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      setMultiple({ '/ui/isLoading': false });
    }
  };

  // Action handlers
  const actionHandlers = useCallback(
    () => ({
      db_list: async (params: Record<string, unknown>) => {
        setMultiple({ '/ui/isLoading': true });
        try {
          const response = await fetch('/api/actions/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'db_list',
              params: { ...params, connectionId, table: tableName },
            }),
          });
          const result = await response.json();
          if (result.success) {
            setMultiple({
              '/data/items': result.data.items,
              '/data/pagination': result.data.pagination,
              '/ui/isLoading': false,
            });
          } else {
            setMultiple({ '/ui/isLoading': false });
          }
          return result.data?.items || [];
        } catch {
          setMultiple({ '/ui/isLoading': false });
          return [];
        }
      },

      db_get: async (params: Record<string, unknown>) => {
        const response = await fetch('/api/actions/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'db_get',
            params: { ...params, connectionId, table: tableName },
          }),
        });
        const result = await response.json();
        if (result.success) {
          setMultiple({
            '/form': result.data,
            '/ui/showEditModal': true,
          });
        }
        return result.data;
      },

      db_insert: async (params: Record<string, unknown>) => {
        const response = await fetch('/api/actions/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'db_insert',
            params: { ...params, connectionId, table: tableName },
          }),
        });
        const result = await response.json();
        if (result.success) {
          await loadData();
          setMultiple({
            '/ui/showCreateModal': false,
            '/ui/successMessage': 'Record created successfully',
          });
        } else {
          throw new Error(result.error || 'Failed to create record');
        }
        return result.data;
      },

      db_update: async (params: Record<string, unknown>) => {
        const response = await fetch('/api/actions/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'db_update',
            params: { ...params, connectionId, table: tableName },
          }),
        });
        const result = await response.json();
        if (result.success) {
          await loadData();
          setMultiple({
            '/ui/showEditModal': false,
            '/ui/successMessage': 'Record updated successfully',
          });
        } else {
          throw new Error(result.error || 'Failed to update record');
        }
        return result.data;
      },

      db_delete: async (params: Record<string, unknown>) => {
        const response = await fetch('/api/actions/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'db_delete',
            params: { ...params, connectionId, table: tableName },
          }),
        });
        const result = await response.json();
        if (result.success) {
          await loadData();
          setMultiple({
            '/ui/showDeleteModal': false,
            '/ui/successMessage': 'Record deleted successfully',
          });
        } else {
          throw new Error(result.error || 'Failed to delete record');
        }
        return result.data;
      },

      db_search: async (params: Record<string, unknown>) => {
        setMultiple({ '/ui/isLoading': true });
        try {
          const response = await fetch('/api/actions/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'db_search',
              params: { ...params, connectionId, table: tableName },
            }),
          });
          const result = await response.json();
          if (result.success) {
            setMultiple({
              '/data/items': result.data.items,
              '/data/pagination': result.data.pagination,
              '/ui/isLoading': false,
            });
          } else {
            setMultiple({ '/ui/isLoading': false });
          }
          return result.data?.items || [];
        } catch {
          setMultiple({ '/ui/isLoading': false });
          return [];
        }
      },

      db_export: async (params: Record<string, unknown>) => {
        try {
          // Fetch all data with current filters (no pagination limit)
          const response = await fetch('/api/actions/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'db_search',
              params: {
                ...params,
                connectionId,
                table: tableName,
                page: 1,
                limit: 10000, // Large limit to get all filtered data
              },
            }),
          });
          const result = await response.json();

          if (result.success && result.data?.items) {
            const items = result.data.items;

            if (items.length === 0) {
              alert('No data to export');
              return { success: false };
            }

            // Create workbook and worksheet
            const worksheet = XLSX.utils.json_to_sheet(items);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, tableName);

            // Generate filename with timestamp
            const timestamp = new Date().toISOString().slice(0, 10);
            const filename = `${tableName}_${timestamp}.xlsx`;

            // Download the file
            XLSX.writeFile(workbook, filename);

            return { success: true };
          }

          return { success: false };
        } catch (error) {
          console.error('Export failed:', error);
          alert('Failed to export data');
          return { success: false };
        }
      },

      http_request: async (params: Record<string, unknown>) => {
        const response = await fetch('/api/actions/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'http_request',
            params,
          }),
        });
        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.data;
      },

      set_data: async () => {
        // This is a no-op - the actual data updates happen via onSuccess/onError callbacks
        return { success: true };
      },

      navigate: async (params: Record<string, unknown>) => {
        // TODO: Implement navigation
        return { success: true };
      },

      open_modal: async (params: Record<string, unknown>) => {
        const { id } = params as { id: string };
        setMultiple({ [`/ui/show${id}`]: true });
        return { success: true };
      },

      close_modal: async (params: Record<string, unknown>) => {
        const { id } = params as { id: string };
        setMultiple({ [`/ui/show${id}`]: false });
        return { success: true };
      },
    }),
    [connectionId, tableName, setMultiple]
  );

  return (
    <div className="min-h-full md:h-full flex flex-col">
      <ActionProvider actions={actionHandlers()}>
        <Renderer tree={ui} isAuthenticated={true} />
      </ActionProvider>
    </div>
  );
}
