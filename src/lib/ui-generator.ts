import { UIElement } from '@/components/renderer';

interface ColumnSchema {
  name: string;
  type: string;
  udtType: string;
  fieldType: 'text' | 'number' | 'boolean' | 'date' | 'datetime' | 'currency' | 'json';
  nullable: boolean;
  hasDefault: boolean;
  isPrimaryKey: boolean;
  isUnique: boolean;
  maxLength?: number | null;
}

interface TableSchema {
  table: string;
  columns: ColumnSchema[];
  primaryKey: string[];
}

/**
 * Map field type to form component type
 */
function getFieldComponent(
  col: ColumnSchema
): 'TextField' | 'NumberField' | 'DateField' | 'SelectField' | 'JsonField' {
  switch (col.fieldType) {
    case 'number':
    case 'currency':
      return 'NumberField';
    case 'boolean':
      return 'SelectField';
    case 'date':
    case 'datetime':
      return 'DateField';
    case 'json':
      return 'JsonField';
    default:
      return 'TextField';
  }
}

/**
 * Get display columns (non-PK, includes timestamps)
 */
function getDisplayColumns(columns: ColumnSchema[]): ColumnSchema[] {
  const excludedColumns = ['deleted_at']; // Only exclude deleted_at
  return columns.filter(
    (col) =>
      !col.isPrimaryKey &&
      !excludedColumns.includes(col.name.toLowerCase())
  );
}

/**
 * Get searchable columns (text, boolean, and date columns for filtering)
 */
function getSearchableColumns(columns: ColumnSchema[]): ColumnSchema[] {
  const searchableTypes = ['text', 'boolean'];
  const dateTypes = ['date', 'datetime'];
  const technicalColumns = ['deleted_at', 'id'];

  const textAndBoolFilters = columns
    .filter(
      (col) =>
        !col.isPrimaryKey &&
        !technicalColumns.includes(col.name.toLowerCase()) &&
        searchableTypes.includes(col.fieldType)
    )
    .slice(0, 3); // Limit text/boolean to 3 filters

  const dateFilters = columns
    .filter(
      (col) =>
        !col.isPrimaryKey &&
        !technicalColumns.includes(col.name.toLowerCase()) &&
        dateTypes.includes(col.fieldType)
    )
    .slice(0, 2); // Limit to 2 date filters (e.g., created_at, updated_at)

  return [...textAndBoolFilters, ...dateFilters];
}

/**
 * Get table columns for display (including PK and display columns)
 * Shows all columns by default - UI handles visibility toggle
 */
function getTableDisplayColumns(columns: ColumnSchema[]): ColumnSchema[] {
  const pk = columns.find((col) => col.isPrimaryKey);
  const displayCols = getDisplayColumns(columns);

  return pk ? [pk, ...displayCols] : displayCols;
}

/**
 * Detect enhanced column type for rich display
 */
function detectEnhancedColumnType(col: ColumnSchema): {
  cellType: string;
  foreignTable?: string;
} {
  const name = col.name.toLowerCase();

  // Foreign key detection (ends with _id but not just "id")
  if (name.endsWith('_id') && name !== 'id') {
    const foreignTable = name.slice(0, -3); // Remove "_id" suffix
    // Convert to plural for table name (simple heuristic)
    const tableName = foreignTable.endsWith('y')
      ? foreignTable.slice(0, -1) + 'ies'
      : foreignTable + 's';
    return { cellType: 'foreignKey', foreignTable: tableName };
  }

  // Category/enum detection
  const categoryPatterns = ['status', 'type', 'category', 'state', 'role', 'tier', 'level', 'plan', 'method'];
  if (categoryPatterns.some(p => name.includes(p)) && col.fieldType === 'text') {
    return { cellType: 'category' };
  }

  // Percentage detection
  const percentPatterns = ['percent', 'rate', 'ratio', 'usage', 'progress'];
  if (percentPatterns.some(p => name.includes(p)) && col.fieldType === 'number') {
    return { cellType: 'percentage' };
  }

  // Currency detection (based on name patterns)
  const currencyPatterns = ['price', 'cost', 'amount', 'total', 'subtotal', 'fee', 'salary', 'revenue', 'budget'];
  if (currencyPatterns.some(p => name.includes(p)) && (col.fieldType === 'number' || col.fieldType === 'currency')) {
    return { cellType: 'currency' };
  }

  // Boolean
  if (col.fieldType === 'boolean') {
    return { cellType: 'boolean' };
  }

  // Datetime (includes created_at, updated_at)
  if (col.fieldType === 'datetime' || name.endsWith('_at')) {
    return { cellType: 'datetime' };
  }

  // Date
  if (col.fieldType === 'date') {
    return { cellType: 'date' };
  }

  // Number
  if (col.fieldType === 'number') {
    return { cellType: 'number' };
  }

  return { cellType: 'text' };
}

/**
 * Map column to table column definition with enhanced type info
 */
function mapToTableColumn(col: ColumnSchema): {
  key: string;
  label: string;
  type: string;
  cellType: string;
  foreignTable?: string;
} {
  // Convert snake_case to Title Case
  const label = col.name
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Get enhanced type detection
  const { cellType, foreignTable } = detectEnhancedColumnType(col);

  // Basic type for backwards compatibility
  let type: string;
  switch (col.fieldType) {
    case 'number':
      type = 'number';
      break;
    case 'currency':
      type = 'currency';
      break;
    case 'boolean':
      type = 'boolean';
      break;
    case 'date':
    case 'datetime':
      type = 'date';
      break;
    default:
      type = 'text';
  }

  return { key: col.name, label, type, cellType, foreignTable };
}

/**
 * Generate form field element
 */
function generateFormField(col: ColumnSchema, basePath: string): UIElement {
  const label = col.name
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const valuePath = `${basePath}/${col.name}`;
  const required = !col.nullable && !col.hasDefault;

  // Boolean fields use SelectField
  if (col.fieldType === 'boolean') {
    return {
      type: 'SelectField',
      props: {
        label,
        valuePath,
        required,
        options: [
          { value: true, label: 'Yes' },
          { value: false, label: 'No' },
        ],
        placeholder: 'Select...',
      },
    };
  }

  const component = getFieldComponent(col);
  const baseProps: Record<string, unknown> = {
    label,
    valuePath,
    required,
  };

  if (component === 'TextField') {
    if (col.maxLength && col.maxLength > 255) {
      baseProps.multiline = true;
      baseProps.rows = 3;
    }
    if (col.name.toLowerCase().includes('email')) {
      baseProps.type = 'email';
      baseProps.checks = [
        { fn: 'email', message: 'Invalid email address' },
      ];
    }
  }

  if (component === 'NumberField' && col.fieldType === 'currency') {
    baseProps.prefix = 'R$';
    baseProps.step = 0.01;
  }

  if (component === 'DateField' && col.fieldType === 'datetime') {
    baseProps.includeTime = true;
  }

  return {
    type: component,
    props: baseProps,
  };
}

interface GenerateOptions {
  readonly?: boolean;
}

/**
 * Generate CRUD UI for a table
 */
export function generateCrudUI(
  schema: TableSchema,
  connectionId: string,
  options: GenerateOptions = {}
): UIElement {
  const { readonly = false } = options;
  const { table, columns, primaryKey } = schema;
  const pkColumn = primaryKey[0] || 'id';
  const displayColumns = getTableDisplayColumns(columns);
  // Include JSON columns even if they have defaults (they're usually editable)
  const formColumns = columns.filter((col) => !col.isPrimaryKey && (!col.hasDefault || col.fieldType === 'json'));

  // Title case for table name
  const tableTitle = table
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Build the UI tree
  const ui: UIElement = {
    type: 'Page',
    props: {
      title: `${tableTitle} Management`,
      subtitle: `View and manage ${table} records`,
    },
    children: [
      // Alert for success messages (errors show inside modals)
      {
        type: 'Alert',
        props: {
          messagePath: '/ui/successMessage',
          variant: 'success',
          dismissible: true,
        },
      },

      // Main content section
      {
        type: 'Section',
        props: { title: 'Records' },
        children: [
          {
            type: 'Card',
            props: { padding: 'none' },
            children: [
              // Search and filter bar
              {
                type: 'SearchFilter',
                props: {
                  searchPath: '/filters/search',
                  searchPlaceholder: `Search ${table}...`,
                  filters: getSearchableColumns(columns).map((col) => {
                    const label = col.name
                      .split('_')
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(' ');

                    // Boolean filters
                    if (col.fieldType === 'boolean') {
                      return {
                        key: col.name,
                        label,
                        type: 'select' as const,
                        options: [
                          { value: 'true', label: 'Yes' },
                          { value: 'false', label: 'No' },
                        ],
                      };
                    }

                    // Date/datetime filters
                    if (col.fieldType === 'date' || col.fieldType === 'datetime') {
                      return {
                        key: col.name,
                        label,
                        type: 'daterange' as const,
                        includeTime: col.fieldType === 'datetime',
                      };
                    }

                    // Text filters
                    return {
                      key: col.name,
                      label,
                      type: 'text' as const,
                    };
                  }),
                  onSearch: {
                    name: 'db_search',
                    params: {
                      connectionId,
                      table,
                      search: { path: '/filters/search' },
                      filters: { path: '/filters' },
                    },
                  },
                },
              },

              // Action buttons row
              {
                type: 'Row',
                props: { gap: 'sm', justify: 'end', className: 'p-4' },
                children: [
                  {
                    type: 'Button',
                    props: {
                      label: 'Export',
                      variant: 'secondary',
                      icon: 'download',
                      action: {
                        name: 'db_export',
                        params: {
                          connectionId,
                          table,
                          filters: { path: '/filters' },
                        },
                      },
                    },
                  },
                  {
                    type: 'Button',
                    props: {
                      label: 'Refresh',
                      variant: 'secondary',
                      icon: 'refresh',
                      action: {
                        name: 'db_list',
                        params: {
                          connectionId,
                          table,
                          page: 1,
                          limit: 20,
                        },
                        onSuccess: {
                          set: { '/data/items': '$result', '/ui/isLoading': false },
                        },
                      },
                    },
                  },
                  // Only show Add button if not readonly
                  ...(!readonly ? [{
                    type: 'Button',
                    props: {
                      label: 'Add',
                      variant: 'primary',
                      icon: 'plus',
                      action: {
                        name: 'set_data',
                        onSuccess: {
                          set: { '/form': {}, '/ui/showCreateModal': true },
                        },
                      },
                    },
                  }] : []),
                ],
              },

              // Data table
              {
                type: 'Table',
                props: {
                  columns: displayColumns.map(mapToTableColumn),
                  dataPath: '/data/items',
                  rowKey: pkColumn,
                  connectionId, // Pass connectionId for FK lookups
                  loadingPath: '/ui/isLoading',
                  paginationPath: '/data/pagination',
                  enableColumnToggle: true,
                  defaultVisibleColumns: 6,
                  emptyMessage: readonly
                    ? `No ${table} found.`
                    : `No ${table} found. Click "Add" to create one.`,
                  onPageChange: {
                    name: 'db_list',
                    params: {
                      connectionId,
                      table,
                      limit: 20,
                    },
                  },
                  // Only show row actions if not readonly
                  ...(readonly ? {} : {
                    rowActions: [
                      {
                        name: 'db_get',
                        params: {
                          connectionId,
                          table,
                        },
                      },
                      {
                        name: 'db_delete',
                        params: {
                          connectionId,
                          table,
                        },
                        confirm: {
                          title: 'Confirm Delete',
                          message: 'Are you sure you want to delete this record? This action cannot be undone.',
                          variant: 'danger',
                        },
                      },
                    ],
                  }),
                },
              },
            ],
          },
        ],
      },

      // Create Modal with Form (only if not readonly)
      ...(!readonly ? [{
        type: 'FormModal',
        props: {
          title: `Create ${tableTitle}`,
          openPath: '/ui/showCreateModal',
          errorPath: '/ui/createError',
          confirmLabel: 'Create',
          onConfirm: {
            name: 'db_insert',
            params: {
              connectionId,
              table,
              data: { path: '/form' },
            },
            onSuccess: {
              set: {
                '/ui/showCreateModal': false,
                '/ui/successMessage': 'Record created successfully',
                '/form': {},
              },
            },
            onError: {
              set: {
                '/ui/createError': '$error.message',
              },
            },
          },
        },
        children: formColumns.map((col) => generateFormField(col, '/form')),
      }] : []),

      // Edit Modal with Form (only if not readonly)
      ...(!readonly ? [{
        type: 'FormModal',
        props: {
          title: `Edit ${tableTitle}`,
          openPath: '/ui/showEditModal',
          errorPath: '/ui/editError',
          confirmLabel: 'Save',
          onConfirm: {
            name: 'db_update',
            params: {
              connectionId,
              table,
              id: { path: `/form/${pkColumn}` },
              data: { path: '/form' },
            },
            onSuccess: {
              set: {
                '/ui/showEditModal': false,
                '/ui/successMessage': 'Record updated successfully',
              },
            },
            onError: {
              set: {
                '/ui/editError': '$error.message',
              },
            },
          },
        },
        children: formColumns.map((col) => generateFormField(col, '/form')),
      }] : []),

      // Delete confirmation modal (only if not readonly)
      ...(!readonly ? [{
        type: 'ModalConfirm',
        props: {
          id: 'deleteModal',
          title: 'Confirm Delete',
          message: 'Are you sure you want to delete this record? This action cannot be undone.',
          openPath: '/ui/showDeleteModal',
          errorPath: '/ui/deleteError',
          confirmLabel: 'Delete',
          variant: 'danger',
          onConfirm: {
            name: 'db_delete',
            params: {
              connectionId,
              table,
              id: { path: '/ui/deleteId' },
            },
            onSuccess: {
              set: {
                '/ui/showDeleteModal': false,
                '/ui/successMessage': 'Record deleted successfully',
              },
            },
            onError: {
              set: {
                '/ui/deleteError': '$error.message',
              },
            },
          },
        },
      }] : []),
    ],
  };

  return ui;
}

/**
 * Generate a simpler list-only UI
 */
export function generateListUI(
  schema: TableSchema,
  connectionId: string
): UIElement {
  const { table, columns, primaryKey } = schema;
  const pkColumn = primaryKey[0] || 'id';
  const displayColumns = getTableDisplayColumns(columns);

  const tableTitle = table
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    type: 'Card',
    props: { title: tableTitle, padding: 'none' },
    children: [
      {
        type: 'Table',
        props: {
          columns: displayColumns.map(mapToTableColumn),
          dataPath: `/data/${table}`,
          rowKey: pkColumn,
          emptyMessage: 'No records found',
        },
      },
    ],
  };
}
