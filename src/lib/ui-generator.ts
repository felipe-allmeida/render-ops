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
): 'TextField' | 'NumberField' | 'DateField' | 'SelectField' {
  switch (col.fieldType) {
    case 'number':
    case 'currency':
      return 'NumberField';
    case 'boolean':
      return 'SelectField';
    case 'date':
    case 'datetime':
      return 'DateField';
    default:
      return 'TextField';
  }
}

/**
 * Get display columns (non-PK, non-technical columns)
 */
function getDisplayColumns(columns: ColumnSchema[]): ColumnSchema[] {
  const technicalColumns = ['created_at', 'updated_at', 'deleted_at'];
  return columns.filter(
    (col) =>
      !col.isPrimaryKey &&
      !technicalColumns.includes(col.name.toLowerCase())
  );
}

/**
 * Get searchable columns (text-based columns good for filtering)
 */
function getSearchableColumns(columns: ColumnSchema[]): ColumnSchema[] {
  const searchableTypes = ['text', 'boolean'];
  const technicalColumns = ['created_at', 'updated_at', 'deleted_at', 'id'];
  return columns
    .filter(
      (col) =>
        !col.isPrimaryKey &&
        !technicalColumns.includes(col.name.toLowerCase()) &&
        searchableTypes.includes(col.fieldType)
    )
    .slice(0, 3); // Limit to 3 filters to keep UI clean
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
 * Map column to table column definition
 */
function mapToTableColumn(col: ColumnSchema): {
  key: string;
  label: string;
  type: string;
} {
  // Convert snake_case to Title Case
  const label = col.name
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

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

  return { key: col.name, label, type };
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
  const formColumns = columns.filter((col) => !col.isPrimaryKey && !col.hasDefault);

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
                  filters: getSearchableColumns(columns).map((col) => ({
                    key: col.name,
                    label: col.name
                      .split('_')
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(' '),
                    type: col.fieldType === 'boolean' ? 'select' : 'text',
                    options:
                      col.fieldType === 'boolean'
                        ? [
                            { value: 'true', label: 'Yes' },
                            { value: 'false', label: 'No' },
                          ]
                        : undefined,
                  })),
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
                      label: `Add ${tableTitle}`,
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
                  loadingPath: '/ui/isLoading',
                  paginationPath: '/data/pagination',
                  enableColumnToggle: true,
                  defaultVisibleColumns: 6,
                  emptyMessage: readonly
                    ? `No ${table} found.`
                    : `No ${table} found. Click "Add ${tableTitle}" to create one.`,
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
