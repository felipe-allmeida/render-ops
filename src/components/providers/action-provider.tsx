'use client';

import React, { createContext, useContext, useCallback, useState, useRef } from 'react';
import { useData } from './data-provider';
import { getValueByPath } from '@/lib/utils';

interface Action {
  name: string;
  params?: Record<string, unknown>;
  confirm?: {
    title: string;
    message: string;
    variant?: 'default' | 'danger' | 'warning';
  };
  onSuccess?: {
    set?: Record<string, unknown>;
    action?: string;
  };
  onError?: {
    set?: Record<string, unknown>;
    action?: string;
  };
}

interface ActionHandler {
  (params: Record<string, unknown>): Promise<unknown>;
}

interface ActionContextType {
  executeAction: (action: Action) => Promise<void>;
  isLoading: boolean;
  pendingConfirm: Action | null;
  confirmAction: () => void;
  cancelConfirm: () => void;
}

const ActionContext = createContext<ActionContextType | null>(null);

interface ActionProviderProps {
  actions: Record<string, ActionHandler>;
  children: React.ReactNode;
}

export function ActionProvider({ actions, children }: ActionProviderProps) {
  const { data, setMultiple } = useData();
  const [isLoading, setIsLoading] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<Action | null>(null);

  // Use ref to always have access to latest data (avoid stale closures)
  const dataRef = useRef(data);
  dataRef.current = data;

  /**
   * Resolve parameter values from data paths
   */
  const resolveParams = useCallback(
    (params?: Record<string, unknown>): Record<string, unknown> => {
      if (!params) return {};

      const currentData = dataRef.current;
      const resolved: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(params)) {
        if (typeof value === 'object' && value !== null && 'path' in value) {
          // Resolve path reference
          resolved[key] = getValueByPath(currentData, (value as { path: string }).path);
        } else {
          resolved[key] = value;
        }
      }
      return resolved;
    },
    []
  );

  /**
   * Apply success/error callbacks
   */
  const applyCallbacks = useCallback(
    (callbacks: Action['onSuccess'] | Action['onError'], result?: unknown) => {
      if (!callbacks) return;

      if (callbacks.set) {
        const updates: Record<string, unknown> = {};
        for (const [path, value] of Object.entries(callbacks.set)) {
          // Handle special $error.message placeholder
          if (typeof value === 'string' && value.startsWith('$error.')) {
            const errorProp = value.replace('$error.', '');
            if (result && typeof result === 'object' && errorProp in result) {
              updates[path] = (result as Record<string, unknown>)[errorProp];
            }
          } else if (typeof value === 'string' && value === '$result') {
            updates[path] = result;
          } else {
            updates[path] = value;
          }
        }
        setMultiple(updates);
      }
    },
    [setMultiple]
  );

  /**
   * Execute an action with optional confirmation
   */
  const executeAction = useCallback(
    async (action: Action) => {
      // Handle confirmation dialog
      if (action.confirm && !pendingConfirm) {
        setPendingConfirm(action);
        return;
      }

      const handler = actions[action.name];
      if (!handler) {
        console.error(`Unknown action: ${action.name}`);
        return;
      }

      setIsLoading(true);
      try {
        const resolvedParams = resolveParams(action.params);
        const result = await handler(resolvedParams);
        applyCallbacks(action.onSuccess, result);
      } catch (error) {
        console.error(`Action ${action.name} failed:`, error);
        applyCallbacks(action.onError, {
          message: error instanceof Error ? error.message : 'An error occurred',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [actions, resolveParams, applyCallbacks, pendingConfirm]
  );

  const confirmAction = useCallback(() => {
    if (pendingConfirm) {
      const action = { ...pendingConfirm, confirm: undefined };
      setPendingConfirm(null);
      executeAction(action);
    }
  }, [pendingConfirm, executeAction]);

  const cancelConfirm = useCallback(() => {
    setPendingConfirm(null);
  }, []);

  return (
    <ActionContext.Provider
      value={{
        executeAction,
        isLoading,
        pendingConfirm,
        confirmAction,
        cancelConfirm,
      }}
    >
      {children}
      {/* Confirmation Dialog */}
      {pendingConfirm?.confirm && (
        <ConfirmDialog
          title={pendingConfirm.confirm.title}
          message={pendingConfirm.confirm.message}
          variant={pendingConfirm.confirm.variant}
          onConfirm={confirmAction}
          onCancel={cancelConfirm}
        />
      )}
    </ActionContext.Provider>
  );
}

interface ConfirmDialogProps {
  title: string;
  message: string;
  variant?: 'default' | 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({
  title,
  message,
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmButtonClasses = {
    default: 'bg-blue-600 hover:bg-blue-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-yellow-500 hover:bg-yellow-600 text-white',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onCancel}
        />
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 mb-6">{message}</p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 text-sm font-medium rounded-md ${confirmButtonClasses[variant]}`}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function useActions() {
  const context = useContext(ActionContext);
  if (!context) {
    throw new Error('useActions must be used within an ActionProvider');
  }
  return context;
}
