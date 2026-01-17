/**
 * SQL Server Type Mapping
 *
 * Maps SQL Server native types to normalized field types.
 */

import { FieldType } from '../../types';

export const SQLSERVER_TYPE_MAP: Record<string, FieldType> = {
  // Exact numerics
  bit: 'boolean',
  tinyint: 'number',
  smallint: 'number',
  int: 'number',
  bigint: 'number',
  decimal: 'number',
  numeric: 'number',
  money: 'currency',
  smallmoney: 'currency',

  // Approximate numerics
  float: 'number',
  real: 'number',

  // Date and time
  date: 'date',
  time: 'time',
  datetime: 'datetime',
  datetime2: 'datetime',
  smalldatetime: 'datetime',
  datetimeoffset: 'datetime',

  // Character strings
  char: 'text',
  varchar: 'text',
  text: 'text',

  // Unicode character strings
  nchar: 'text',
  nvarchar: 'text',
  ntext: 'text',

  // Binary strings
  binary: 'binary',
  varbinary: 'binary',
  image: 'binary',

  // Other data types
  uniqueidentifier: 'uuid',
  xml: 'text',
  sql_variant: 'text',

  // JSON (SQL Server 2016+)
  // Note: SQL Server stores JSON as nvarchar, but we can detect it
  json: 'json',

  // Spatial types (treated as text)
  geometry: 'text',
  geography: 'text',

  // Hierarchyid
  hierarchyid: 'text',
};

/**
 * Map a SQL Server type to a normalized field type
 */
export function mapSQLServerTypeToFieldType(sqlType: string): FieldType {
  const normalizedType = sqlType.toLowerCase().trim();

  // Remove size/precision parameters for lookup
  const baseType = normalizedType.replace(/\([^)]*\)/g, '').trim();

  // Direct lookup
  const mappedType = SQLSERVER_TYPE_MAP[baseType];
  if (mappedType) {
    return mappedType;
  }

  // Check for MAX variants
  if (
    normalizedType.includes('varchar(max)') ||
    normalizedType.includes('nvarchar(max)')
  ) {
    return 'text';
  }

  if (normalizedType.includes('varbinary(max)')) {
    return 'binary';
  }

  // Default to text for unknown types
  return 'text';
}
