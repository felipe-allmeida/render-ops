/**
 * MongoDB Schema Inference
 *
 * Infers schema from MongoDB documents since MongoDB is schemaless.
 */

import { FieldType, ColumnSchema } from '../../types';

/**
 * Infer the field type from a JavaScript value
 */
export function inferFieldType(value: unknown): FieldType {
  if (value === null || value === undefined) {
    return 'text'; // Default for null values
  }

  if (Array.isArray(value)) {
    return 'array';
  }

  if (value instanceof Date) {
    return 'datetime';
  }

  // Check for ObjectId (has _bsontype property or toHexString method)
  if (
    typeof value === 'object' &&
    value !== null &&
    (('_bsontype' in value && (value as { _bsontype: string })._bsontype === 'ObjectId') ||
      'toHexString' in value)
  ) {
    return 'uuid';
  }

  // Check for Binary data
  if (
    typeof value === 'object' &&
    value !== null &&
    '_bsontype' in value &&
    (value as { _bsontype: string })._bsontype === 'Binary'
  ) {
    return 'binary';
  }

  const type = typeof value;

  switch (type) {
    case 'string':
      // Try to detect dates in string format
      if (isISODateString(value as string)) {
        return 'datetime';
      }
      if (isDateOnlyString(value as string)) {
        return 'date';
      }
      return 'text';

    case 'number':
      return 'number';

    case 'boolean':
      return 'boolean';

    case 'object':
      return 'json';

    default:
      return 'text';
  }
}

/**
 * Check if a string looks like an ISO date
 */
function isISODateString(value: string): boolean {
  // Match ISO 8601 date-time format
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);
}

/**
 * Check if a string looks like a date-only string
 */
function isDateOnlyString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * Get the most common type from a list of types
 */
function getMostCommonType(types: FieldType[]): FieldType {
  if (types.length === 0) return 'text';

  const typeCounts = new Map<FieldType, number>();

  for (const type of types) {
    typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
  }

  let maxCount = 0;
  let mostCommon: FieldType = 'text';

  for (const [type, count] of typeCounts) {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = type;
    }
  }

  return mostCommon;
}

/**
 * Infer schema from a collection of documents
 */
export function inferSchemaFromDocuments(documents: Record<string, unknown>[]): ColumnSchema[] {
  if (documents.length === 0) {
    return [];
  }

  // Collect field information across all documents
  const fieldInfo = new Map<
    string,
    {
      types: FieldType[];
      nullCount: number;
      sampleValues: unknown[];
    }
  >();

  for (const doc of documents) {
    for (const [key, value] of Object.entries(doc)) {
      if (!fieldInfo.has(key)) {
        fieldInfo.set(key, { types: [], nullCount: 0, sampleValues: [] });
      }

      const info = fieldInfo.get(key)!;

      if (value === null || value === undefined) {
        info.nullCount++;
      } else {
        info.types.push(inferFieldType(value));
        if (info.sampleValues.length < 5) {
          info.sampleValues.push(value);
        }
      }
    }
  }

  // Build column schemas
  const columns: ColumnSchema[] = [];

  for (const [fieldName, info] of fieldInfo) {
    const fieldType = getMostCommonType(info.types);
    const isPrimaryKey = fieldName === '_id';
    const nullableRatio = info.nullCount / documents.length;

    columns.push({
      name: fieldName,
      type: getMongoDBTypeName(fieldType),
      fieldType,
      nullable: nullableRatio > 0.1, // Consider nullable if >10% null
      isPrimaryKey,
      isAutoIncrement: isPrimaryKey, // _id is auto-generated
    });
  }

  // Sort columns: _id first, then alphabetically
  columns.sort((a, b) => {
    if (a.name === '_id') return -1;
    if (b.name === '_id') return 1;
    return a.name.localeCompare(b.name);
  });

  return columns;
}

/**
 * Get a MongoDB type name from a field type
 */
function getMongoDBTypeName(fieldType: FieldType): string {
  switch (fieldType) {
    case 'text':
      return 'String';
    case 'number':
      return 'Number';
    case 'boolean':
      return 'Boolean';
    case 'date':
    case 'datetime':
      return 'Date';
    case 'uuid':
      return 'ObjectId';
    case 'array':
      return 'Array';
    case 'json':
      return 'Object';
    case 'binary':
      return 'BinData';
    default:
      return 'Mixed';
  }
}

/**
 * Flatten nested document fields for table display
 */
export function flattenDocument(
  doc: Record<string, unknown>,
  prefix = '',
  maxDepth = 2
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(doc)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !(value instanceof Date) &&
      !('_bsontype' in value) &&
      maxDepth > 0
    ) {
      // Recursively flatten nested objects
      const nested = flattenDocument(value as Record<string, unknown>, fullKey, maxDepth - 1);
      Object.assign(result, nested);
    } else {
      result[fullKey] = value;
    }
  }

  return result;
}
