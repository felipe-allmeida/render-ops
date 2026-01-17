/**
 * MySQL Type Mapping
 *
 * Maps MySQL native types to normalized field types.
 */

import { FieldType } from '../../types';

export const MYSQL_TYPE_MAP: Record<string, FieldType> = {
  // Integer types
  tinyint: 'number',
  smallint: 'number',
  mediumint: 'number',
  int: 'number',
  integer: 'number',
  bigint: 'number',

  // Floating point types
  float: 'number',
  double: 'number',
  'double precision': 'number',
  real: 'number',

  // Fixed-point types
  decimal: 'number',
  numeric: 'number',
  dec: 'number',
  fixed: 'number',

  // Bit type
  bit: 'number',

  // Boolean (MySQL uses TINYINT(1))
  bool: 'boolean',
  boolean: 'boolean',

  // String types
  char: 'text',
  varchar: 'text',
  tinytext: 'text',
  text: 'text',
  mediumtext: 'text',
  longtext: 'text',

  // Binary types
  binary: 'binary',
  varbinary: 'binary',
  tinyblob: 'binary',
  blob: 'binary',
  mediumblob: 'binary',
  longblob: 'binary',

  // Date and time types
  date: 'date',
  time: 'time',
  datetime: 'datetime',
  timestamp: 'datetime',
  year: 'number',

  // JSON type (MySQL 5.7.8+)
  json: 'json',

  // Spatial types (treated as text)
  geometry: 'text',
  point: 'text',
  linestring: 'text',
  polygon: 'text',
  multipoint: 'text',
  multilinestring: 'text',
  multipolygon: 'text',
  geometrycollection: 'text',

  // Enum and Set (treated as text)
  enum: 'text',
  set: 'text',
};

/**
 * Map a MySQL type to a normalized field type
 */
export function mapMySQLTypeToFieldType(mysqlType: string): FieldType {
  const normalizedType = mysqlType.toLowerCase().trim();

  // Handle TINYINT(1) as boolean
  if (normalizedType.startsWith('tinyint(1)')) {
    return 'boolean';
  }

  // Remove size/precision parameters for lookup
  const baseType = normalizedType.replace(/\([^)]*\)/g, '').trim();

  // Check for unsigned variants
  const typeWithoutUnsigned = baseType.replace(/\s*unsigned\s*/gi, '').trim();

  // Direct lookup
  const mappedType = MYSQL_TYPE_MAP[typeWithoutUnsigned];
  if (mappedType) {
    return mappedType;
  }

  // Check if it's an ENUM or SET with values
  if (normalizedType.startsWith('enum') || normalizedType.startsWith('set')) {
    return 'text';
  }

  // Default to text for unknown types
  return 'text';
}

/**
 * Extract ENUM values from a MySQL ENUM type definition
 */
export function extractEnumValues(enumType: string): string[] {
  const match = enumType.match(/enum\s*\(([^)]+)\)/i);
  if (!match) return [];

  return match[1]
    .split(',')
    .map((v) => v.trim().replace(/^['"]|['"]$/g, ''));
}
