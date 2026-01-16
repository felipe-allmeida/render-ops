import { createCatalog } from '@json-render/core';
import { z } from 'zod';

// Action schema for button actions
export const ActionSchema = z.object({
  name: z.enum([
    'db_list',
    'db_get',
    'db_insert',
    'db_update',
    'db_delete',
    'http_request',
    'navigate',
    'set_data',
    'open_modal',
    'close_modal',
  ]),
  params: z.record(z.any()).optional(),
  confirm: z
    .object({
      title: z.string(),
      message: z.string(),
      variant: z.enum(['default', 'danger', 'warning']).optional(),
    })
    .optional(),
  onSuccess: z
    .object({
      set: z.record(z.any()).optional(),
      action: z.string().optional(),
    })
    .optional(),
  onError: z
    .object({
      set: z.record(z.any()).optional(),
      action: z.string().optional(),
    })
    .optional(),
});

// Validation check schema
const CheckSchema = z.object({
  fn: z.enum(['required', 'email', 'min', 'max', 'pattern', 'minLength', 'maxLength']),
  message: z.string(),
  value: z.any().optional(),
});

// Column schema for Table component
const ColumnSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(['text', 'number', 'date', 'boolean', 'currency']).optional(),
  sortable: z.boolean().optional(),
  width: z.string().optional(),
});

// Create the catalog with all components and actions
export const catalog = createCatalog({
  components: {
    // Layout Components
    Page: {
      props: z.object({
        title: z.string(),
        subtitle: z.string().optional(),
      }),
      hasChildren: true,
    },
    Section: {
      props: z.object({
        title: z.string().optional(),
        collapsible: z.boolean().optional(),
        defaultCollapsed: z.boolean().optional(),
      }),
      hasChildren: true,
    },
    Card: {
      props: z.object({
        title: z.string().optional(),
        subtitle: z.string().optional(),
        padding: z.enum(['none', 'sm', 'md', 'lg']).optional(),
      }),
      hasChildren: true,
    },

    // Data Display Components
    Table: {
      props: z.object({
        columns: z.array(ColumnSchema),
        dataPath: z.string(),
        rowKey: z.string().default('id'),
        selectable: z.boolean().optional(),
        selectedPath: z.string().optional(),
        emptyMessage: z.string().optional(),
        rowActions: z.array(ActionSchema).optional(),
      }),
    },
    SearchFilter: {
      props: z.object({
        searchPath: z.string(),
        searchPlaceholder: z.string().optional(),
        filters: z.array(
          z.object({
            key: z.string(),
            label: z.string(),
            type: z.enum(['text', 'select', 'date']),
            options: z.array(
              z.object({
                value: z.string(),
                label: z.string(),
              })
            ).optional(),
          })
        ).optional(),
        onSearch: ActionSchema,
      }),
    },

    // Form Components
    Form: {
      props: z.object({
        id: z.string().optional(),
        dataPath: z.string(),
        onSubmit: ActionSchema.optional(),
      }),
      hasChildren: true,
    },
    TextField: {
      props: z.object({
        label: z.string(),
        valuePath: z.string(),
        placeholder: z.string().optional(),
        disabled: z.boolean().optional(),
        required: z.boolean().optional(),
        checks: z.array(CheckSchema).optional(),
        validateOn: z.enum(['change', 'blur', 'submit']).optional(),
        type: z.enum(['text', 'email', 'password', 'url', 'tel']).optional(),
        multiline: z.boolean().optional(),
        rows: z.number().optional(),
      }),
    },
    NumberField: {
      props: z.object({
        label: z.string(),
        valuePath: z.string(),
        placeholder: z.string().optional(),
        disabled: z.boolean().optional(),
        required: z.boolean().optional(),
        checks: z.array(CheckSchema).optional(),
        min: z.number().optional(),
        max: z.number().optional(),
        step: z.number().optional(),
        prefix: z.string().optional(),
        suffix: z.string().optional(),
      }),
    },
    DateField: {
      props: z.object({
        label: z.string(),
        valuePath: z.string(),
        placeholder: z.string().optional(),
        disabled: z.boolean().optional(),
        required: z.boolean().optional(),
        includeTime: z.boolean().optional(),
        minDate: z.string().optional(),
        maxDate: z.string().optional(),
      }),
    },
    SelectField: {
      props: z.object({
        label: z.string(),
        valuePath: z.string(),
        options: z.array(
          z.object({
            value: z.union([z.string(), z.number(), z.boolean()]),
            label: z.string(),
          })
        ),
        placeholder: z.string().optional(),
        disabled: z.boolean().optional(),
        required: z.boolean().optional(),
        multiple: z.boolean().optional(),
      }),
    },

    // Action Components
    Button: {
      props: z.object({
        label: z.string(),
        action: ActionSchema,
        variant: z.enum(['primary', 'secondary', 'danger', 'ghost', 'link']).optional(),
        size: z.enum(['sm', 'md', 'lg']).optional(),
        disabled: z.boolean().optional(),
        loading: z.boolean().optional(),
        icon: z.string().optional(),
      }),
    },

    // Feedback Components
    Alert: {
      props: z.object({
        message: z.string(),
        variant: z.enum(['info', 'success', 'warning', 'error']).optional(),
        dismissible: z.boolean().optional(),
        dismissPath: z.string().optional(),
      }),
    },
    Toast: {
      props: z.object({
        message: z.string(),
        variant: z.enum(['info', 'success', 'warning', 'error']).optional(),
        duration: z.number().optional(),
      }),
    },
    ModalConfirm: {
      props: z.object({
        id: z.string(),
        title: z.string(),
        message: z.string(),
        confirmLabel: z.string().optional(),
        cancelLabel: z.string().optional(),
        variant: z.enum(['default', 'danger', 'warning']).optional(),
        onConfirm: ActionSchema,
        onCancel: ActionSchema.optional(),
        openPath: z.string(),
      }),
    },

    // Utility Components
    Spacer: {
      props: z.object({
        size: z.enum(['xs', 'sm', 'md', 'lg', 'xl']).optional(),
      }),
    },
    Divider: {
      props: z.object({
        orientation: z.enum(['horizontal', 'vertical']).optional(),
      }),
    },
    Text: {
      props: z.object({
        content: z.string().optional(),
        valuePath: z.string().optional(),
        variant: z.enum(['h1', 'h2', 'h3', 'body', 'caption', 'code']).optional(),
        color: z.enum(['default', 'muted', 'primary', 'success', 'warning', 'error']).optional(),
      }),
    },
    Row: {
      props: z.object({
        gap: z.enum(['none', 'xs', 'sm', 'md', 'lg']).optional(),
        align: z.enum(['start', 'center', 'end', 'stretch']).optional(),
        justify: z.enum(['start', 'center', 'end', 'between', 'around']).optional(),
        wrap: z.boolean().optional(),
      }),
      hasChildren: true,
    },
  },

  // Available actions that can be executed
  actions: {
    db_list: {
      description: 'List records from a database table with pagination and filtering',
    },
    db_get: {
      description: 'Get a single record from a database table by ID',
    },
    db_insert: {
      description: 'Insert a new record into a database table',
    },
    db_update: {
      description: 'Update an existing record in a database table',
    },
    db_delete: {
      description: 'Delete a record from a database table',
    },
    db_search: {
      description: 'Search and filter records with text search and column filters',
    },
    http_request: {
      description: 'Make an HTTP request to an allowed webhook endpoint',
    },
    navigate: {
      description: 'Navigate to a different page or route',
    },
    set_data: {
      description: 'Set data in the data provider',
    },
    open_modal: {
      description: 'Open a modal dialog',
    },
    close_modal: {
      description: 'Close a modal dialog',
    },
  },
});

export type Catalog = typeof catalog;
export type ActionName = keyof typeof catalog.actions;
export type ComponentName = keyof typeof catalog.components;
