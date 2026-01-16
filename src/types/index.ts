import { z } from 'zod';

// Connection types
export interface Connection {
  id: string;
  name: string;
  connectionString: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConnectionListItem {
  id: string;
  name: string;
  createdAt: string;
}

// Table types
export interface TableInfo {
  name: string;
  type: 'table' | 'view';
}

export interface ColumnSchema {
  name: string;
  type: string;
  udtType: string;
  fieldType: 'text' | 'number' | 'boolean' | 'date' | 'datetime' | 'currency' | 'json';
  nullable: boolean;
  hasDefault: boolean;
  isPrimaryKey: boolean;
  isUnique: boolean;
  maxLength?: number | null;
  precision?: number | null;
  scale?: number | null;
}

export interface TableSchema {
  table: string;
  columns: ColumnSchema[];
  primaryKey: string[];
}

// UI types
export interface UIElement {
  type: string;
  props: Record<string, unknown>;
  children?: UIElement[];
  visible?: VisibilityCondition;
}

export interface VisibilityCondition {
  path?: string;
  auth?: 'signedIn' | 'signedOut';
  and?: VisibilityCondition[];
  or?: VisibilityCondition[];
  not?: VisibilityCondition;
  eq?: { path: string; value: unknown };
}

// Action types
export interface ActionDefinition {
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

export interface ActionResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// Audit log types
export interface AuditLogEntry {
  id: string;
  userId: string;
  actionName: string;
  params?: Record<string, unknown>;
  success: boolean;
  error?: string;
  timestamp: Date;
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Form validation types
export interface ValidationCheck {
  fn: 'required' | 'email' | 'min' | 'max' | 'pattern' | 'minLength' | 'maxLength';
  message: string;
  value?: unknown;
}

// Component props types
export interface TableColumn {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'boolean' | 'currency';
  sortable?: boolean;
  width?: string;
}

export interface SelectOption {
  value: string | number | boolean;
  label: string;
}
