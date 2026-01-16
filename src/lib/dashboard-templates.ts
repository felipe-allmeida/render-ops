// Dashboard Templates - predefined layouts for dashboards

export interface TemplateSlot {
  id: string;
  name: string;
  type: 'kpi' | 'chart' | 'table';
  chartType?: 'bar' | 'line' | 'pie' | 'area';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  preview: string; // ASCII or description of layout
  columns: number;
  rowHeight: number;
  slots: TemplateSlot[];
}

export const DASHBOARD_TEMPLATES: DashboardTemplate[] = [
  {
    id: 'executive',
    name: 'Executive Overview',
    description: '4 KPIs no topo, gráfico principal + pizza, 2 tabelas embaixo',
    preview: `
┌───┬───┬───┬───┐
│KPI│KPI│KPI│KPI│
├───┴───┴─┬─┴───┤
│  Chart  │ Pie │
│  (bar)  │     │
├─────────┼─────┤
│  Table  │Table│
└─────────┴─────┘`,
    columns: 12,
    rowHeight: 80,
    slots: [
      { id: 'kpi-1', name: 'KPI 1', type: 'kpi', x: 0, y: 0, width: 3, height: 1 },
      { id: 'kpi-2', name: 'KPI 2', type: 'kpi', x: 3, y: 0, width: 3, height: 1 },
      { id: 'kpi-3', name: 'KPI 3', type: 'kpi', x: 6, y: 0, width: 3, height: 1 },
      { id: 'kpi-4', name: 'KPI 4', type: 'kpi', x: 9, y: 0, width: 3, height: 1 },
      { id: 'chart-main', name: 'Gráfico Principal', type: 'chart', chartType: 'bar', x: 0, y: 1, width: 8, height: 3 },
      { id: 'chart-pie', name: 'Gráfico Pizza', type: 'chart', chartType: 'pie', x: 8, y: 1, width: 4, height: 3 },
      { id: 'table-1', name: 'Tabela Esquerda', type: 'table', x: 0, y: 4, width: 6, height: 3 },
      { id: 'table-2', name: 'Tabela Direita', type: 'table', x: 6, y: 4, width: 6, height: 3 },
    ],
  },
  {
    id: 'analytics',
    name: 'Analytics Dashboard',
    description: '3 KPIs, gráfico de linha grande, 2 gráficos menores',
    preview: `
┌────┬────┬────┐
│KPI │KPI │KPI │
├────┴────┴────┤
│  Line Chart  │
├──────┬───────┤
│ Bar  │ Area  │
└──────┴───────┘`,
    columns: 12,
    rowHeight: 80,
    slots: [
      { id: 'kpi-1', name: 'KPI 1', type: 'kpi', x: 0, y: 0, width: 4, height: 1 },
      { id: 'kpi-2', name: 'KPI 2', type: 'kpi', x: 4, y: 0, width: 4, height: 1 },
      { id: 'kpi-3', name: 'KPI 3', type: 'kpi', x: 8, y: 0, width: 4, height: 1 },
      { id: 'chart-line', name: 'Gráfico de Linha', type: 'chart', chartType: 'line', x: 0, y: 1, width: 12, height: 3 },
      { id: 'chart-bar', name: 'Gráfico de Barras', type: 'chart', chartType: 'bar', x: 0, y: 4, width: 6, height: 3 },
      { id: 'chart-area', name: 'Gráfico de Área', type: 'chart', chartType: 'area', x: 6, y: 4, width: 6, height: 3 },
    ],
  },
  {
    id: 'sales',
    name: 'Sales Dashboard',
    description: '2 KPIs grandes, tabela principal, gráfico de pizza',
    preview: `
┌───────┬───────┐
│  KPI  │  KPI  │
├───────┴───┬───┤
│   Table   │Pie│
│           │   │
└───────────┴───┘`,
    columns: 12,
    rowHeight: 80,
    slots: [
      { id: 'kpi-1', name: 'KPI Principal', type: 'kpi', x: 0, y: 0, width: 6, height: 1 },
      { id: 'kpi-2', name: 'KPI Secundário', type: 'kpi', x: 6, y: 0, width: 6, height: 1 },
      { id: 'table-main', name: 'Tabela Principal', type: 'table', x: 0, y: 1, width: 8, height: 4 },
      { id: 'chart-pie', name: 'Distribuição', type: 'chart', chartType: 'pie', x: 8, y: 1, width: 4, height: 4 },
    ],
  },
  {
    id: 'simple',
    name: 'Simple Dashboard',
    description: '2 KPIs e 1 gráfico',
    preview: `
┌───────┬───────┐
│  KPI  │  KPI  │
├───────┴───────┤
│    Chart      │
└───────────────┘`,
    columns: 12,
    rowHeight: 80,
    slots: [
      { id: 'kpi-1', name: 'KPI 1', type: 'kpi', x: 0, y: 0, width: 6, height: 1 },
      { id: 'kpi-2', name: 'KPI 2', type: 'kpi', x: 6, y: 0, width: 6, height: 1 },
      { id: 'chart-main', name: 'Gráfico', type: 'chart', chartType: 'bar', x: 0, y: 1, width: 12, height: 3 },
    ],
  },
];

// Helper to create widgets from template
export function createWidgetsFromTemplate(template: DashboardTemplate): Array<{
  id: string;
  type: 'kpi' | 'chart' | 'table' | 'text';
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  config: {
    connectionId?: string;
    table?: string;
    aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max';
    field?: string;
    groupBy?: string;
    chartType?: 'bar' | 'line' | 'pie' | 'area';
  };
}> {
  return template.slots.map((slot) => ({
    id: `widget-${Date.now()}-${slot.id}`,
    type: slot.type,
    title: slot.name,
    x: slot.x,
    y: slot.y,
    width: slot.width,
    height: slot.height,
    config: {
      // KPI and chart widgets need a default aggregation
      aggregation: (slot.type === 'kpi' || slot.type === 'chart') ? 'count' : undefined,
      chartType: slot.chartType,
    },
  }));
}
