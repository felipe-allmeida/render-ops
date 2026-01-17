/**
 * PostgreSQL Type Mapping
 *
 * Maps PostgreSQL native types to normalized field types.
 */

import { FieldType } from '../../types';

export const PG_TYPE_MAP: Record<string, FieldType> = {
  // Numeric types
  int2: 'number',
  int4: 'number',
  int8: 'number',
  smallint: 'number',
  integer: 'number',
  bigint: 'number',
  decimal: 'number',
  numeric: 'number',
  real: 'number',
  float4: 'number',
  float8: 'number',
  'double precision': 'number',
  serial: 'number',
  bigserial: 'number',
  smallserial: 'number',
  money: 'currency',

  // String types
  char: 'text',
  varchar: 'text',
  'character varying': 'text',
  character: 'text',
  text: 'text',
  name: 'text',
  citext: 'text',

  // UUID
  uuid: 'uuid',

  // Boolean
  bool: 'boolean',
  boolean: 'boolean',

  // Date/Time
  date: 'date',
  time: 'time',
  timetz: 'time',
  'time without time zone': 'time',
  'time with time zone': 'time',
  timestamp: 'datetime',
  timestamptz: 'datetime',
  'timestamp without time zone': 'datetime',
  'timestamp with time zone': 'datetime',
  interval: 'text',

  // JSON
  json: 'json',
  jsonb: 'json',

  // Binary
  bytea: 'binary',

  // Network types (treated as text)
  inet: 'text',
  cidr: 'text',
  macaddr: 'text',
  macaddr8: 'text',

  // Geometric types (treated as text)
  point: 'text',
  line: 'text',
  lseg: 'text',
  box: 'text',
  path: 'text',
  polygon: 'text',
  circle: 'text',

  // Full-text search (treated as text)
  tsvector: 'text',
  tsquery: 'text',

  // XML
  xml: 'text',

  // Range types (treated as json)
  int4range: 'json',
  int8range: 'json',
  numrange: 'json',
  tsrange: 'json',
  tstzrange: 'json',
  daterange: 'json',

  // Special types
  oid: 'number',
  regproc: 'text',
  regprocedure: 'text',
  regoper: 'text',
  regoperator: 'text',
  regclass: 'text',
  regtype: 'text',
  regrole: 'text',
  regnamespace: 'text',
  regconfig: 'text',
  regdictionary: 'text',
};

/**
 * Map a PostgreSQL type to a normalized field type
 */
export function mapPgTypeToFieldType(pgType: string): FieldType {
  const normalizedType = pgType.toLowerCase().trim();

  // Check for array types
  if (normalizedType.endsWith('[]') || normalizedType.startsWith('_')) {
    return 'array';
  }

  // Check for user-defined enum types (ARRAY)
  if (normalizedType.startsWith('array')) {
    return 'array';
  }

  // Direct lookup
  const mappedType = PG_TYPE_MAP[normalizedType];
  if (mappedType) {
    return mappedType;
  }

  // Check for types with parameters (e.g., varchar(255), numeric(10,2))
  const baseType = normalizedType.split('(')[0].trim();
  const baseMappedType = PG_TYPE_MAP[baseType];
  if (baseMappedType) {
    return baseMappedType;
  }

  // Default to text for unknown types
  return 'text';
}
