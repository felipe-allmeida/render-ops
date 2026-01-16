import { dbList, dbGet, dbInsert, dbUpdate, dbDelete, dbSearch } from './db-actions';
import { httpRequest } from './http-actions';

export interface ActionResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface ActionParams {
  connectionId?: string;
  table?: string;
  id?: string | number;
  data?: Record<string, unknown>;
  page?: number;
  limit?: number;
  where?: Record<string, unknown>;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, unknown>;
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
}

export type ActionHandler = (
  params: ActionParams,
  userId: string,
  connectionString?: string
) => Promise<ActionResult>;

// Action handlers registry
export const actionHandlers: Record<string, ActionHandler> = {
  db_list: dbList,
  db_get: dbGet,
  db_insert: dbInsert,
  db_update: dbUpdate,
  db_delete: dbDelete,
  db_search: dbSearch,
  http_request: httpRequest,
};

// Validate that an action exists
export function isValidAction(name: string): boolean {
  return name in actionHandlers;
}

// Get all available action names
export function getAvailableActions(): string[] {
  return Object.keys(actionHandlers);
}
