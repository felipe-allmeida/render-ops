/**
 * MongoDB Database Adapter
 *
 * Implements the DatabaseAdapter interface for MongoDB databases.
 * Uses the mongodb native driver.
 */

import {
  MongoClient,
  Db,
  Collection,
  ObjectId,
  Filter,
  Document,
  Sort,
  WithId,
} from 'mongodb';
import {
  DatabaseAdapter,
  DatabaseType,
  AdapterConfig,
  ConnectionTestResult,
  TableInfo,
  TableSchema,
  ListOptions,
  SearchOptions,
  PaginatedResult,
  QueryResult,
  TransactionContext,
  FieldType,
} from '../../types';
import { inferSchemaFromDocuments, inferFieldType } from './schema-inference';

export class MongoDBAdapter implements DatabaseAdapter {
  readonly type: DatabaseType = 'mongodb';
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private config: AdapterConfig;

  constructor(config: AdapterConfig) {
    this.config = config;
  }

  get isConnected(): boolean {
    return this.client !== null && this.db !== null;
  }

  // ============================================
  // Connection Management
  // ============================================

  async connect(): Promise<void> {
    if (this.client && this.db) {
      return;
    }

    this.client = new MongoClient(this.config.connectionString, {
      maxPoolSize: this.config.poolSize ?? 5,
      connectTimeoutMS: this.config.connectionTimeout ?? 10000,
    });

    await this.client.connect();

    // Extract database name from connection string or use default
    const url = new URL(this.config.connectionString);
    const dbName = url.pathname.slice(1) || 'test';
    this.db = this.client.db(dbName);
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const startTime = Date.now();

    try {
      await this.ensureConnected();

      // Run a simple command to verify connection
      const adminDb = this.client!.db('admin');
      const result = await adminDb.command({ buildInfo: 1 });

      return {
        success: true,
        version: `MongoDB ${result.version}`,
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
        latencyMs: Date.now() - startTime,
      };
    }
  }

  // ============================================
  // Schema Operations
  // ============================================

  async listTables(): Promise<TableInfo[]> {
    await this.ensureConnected();

    const collections = await this.db!.listCollections().toArray();

    return collections.map((col) => ({
      name: col.name,
      type: col.type === 'view' ? 'view' : 'collection',
    }));
  }

  async getTableSchema(table: string): Promise<TableSchema> {
    await this.ensureConnected();

    const collection = this.db!.collection(table);

    // Sample documents to infer schema
    const sampleDocs = await collection.find({}).limit(100).toArray();

    // Convert MongoDB documents to plain objects
    const plainDocs = sampleDocs.map((doc) => this.convertDocument(doc));

    // Infer schema from sample documents
    const columns = inferSchemaFromDocuments(plainDocs);

    return {
      name: table,
      columns,
      primaryKey: ['_id'],
    };
  }

  // ============================================
  // CRUD Operations
  // ============================================

  async list(table: string, options: ListOptions = {}): Promise<PaginatedResult> {
    await this.ensureConnected();

    const { page = 1, limit = 20, where, orderBy, orderDirection = 'asc' } = options;

    const collection = this.db!.collection(table);

    // Build filter
    const filter = this.buildFilter(where ?? {});

    // Build sort
    const sort: Sort = orderBy
      ? { [orderBy]: orderDirection === 'desc' ? -1 : 1 }
      : { _id: -1 };

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const cursor = collection.find(filter).sort(sort).skip(skip).limit(limit);

    const docs = await cursor.toArray();
    const items = docs.map((doc) => this.convertDocument(doc));

    // Get total count
    const total = await collection.countDocuments(filter);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async get(table: string, id: string | number): Promise<Record<string, unknown> | null> {
    await this.ensureConnected();

    const collection = this.db!.collection(table);

    // Handle ObjectId conversion
    const filter = this.buildIdFilter(id);

    const doc = await collection.findOne(filter);

    return doc ? this.convertDocument(doc) : null;
  }

  async insert(
    table: string,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    await this.ensureConnected();

    const collection = this.db!.collection(table);

    // Remove _id if it's empty or null (let MongoDB generate it)
    const insertData = { ...data };
    if (!insertData._id) {
      delete insertData._id;
    } else if (typeof insertData._id === 'string') {
      // Try to convert string _id to ObjectId
      try {
        insertData._id = new ObjectId(insertData._id);
      } catch {
        // Keep as string if not a valid ObjectId
      }
    }

    const result = await collection.insertOne(insertData as Document);

    // Fetch the inserted document
    const inserted = await collection.findOne({ _id: result.insertedId });

    return inserted ? this.convertDocument(inserted) : { ...data, _id: result.insertedId.toString() };
  }

  async update(
    table: string,
    id: string | number,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown> | null> {
    await this.ensureConnected();

    const collection = this.db!.collection(table);

    // Remove _id from update data
    const updateData = { ...data };
    delete updateData._id;
    delete updateData.id;

    if (Object.keys(updateData).length === 0) {
      return null;
    }

    const filter = this.buildIdFilter(id);

    const result = await collection.findOneAndUpdate(
      filter,
      { $set: updateData },
      { returnDocument: 'after' }
    );

    return result ? this.convertDocument(result) : null;
  }

  async delete(table: string, id: string | number): Promise<boolean> {
    await this.ensureConnected();

    const collection = this.db!.collection(table);

    const filter = this.buildIdFilter(id);

    const result = await collection.deleteOne(filter);

    return result.deletedCount > 0;
  }

  async search(table: string, options: SearchOptions = {}): Promise<PaginatedResult> {
    await this.ensureConnected();

    const {
      page = 1,
      limit = 20,
      search,
      searchColumns,
      filters,
      orderBy,
      orderDirection = 'asc',
    } = options;

    const collection = this.db!.collection(table);

    // Build filter conditions
    const conditions: Filter<Document>[] = [];

    // Full-text search using $or with regex
    if (search && typeof search === 'string' && search.trim()) {
      let columnsToSearch = searchColumns;

      // If no columns specified, search in common string fields
      if (!columnsToSearch || columnsToSearch.length === 0) {
        // Sample a document to find string fields
        const sample = await collection.findOne({});
        if (sample) {
          columnsToSearch = Object.entries(sample)
            .filter(([_, value]) => typeof value === 'string')
            .map(([key]) => key)
            .slice(0, 10); // Limit to 10 fields
        }
      }

      if (columnsToSearch && columnsToSearch.length > 0) {
        const searchRegex = { $regex: search.trim(), $options: 'i' };
        const searchConditions = columnsToSearch.map((col) => ({
          [col]: searchRegex,
        }));
        conditions.push({ $or: searchConditions });
      }
    }

    // Column filters
    if (filters && typeof filters === 'object') {
      for (const [key, value] of Object.entries(filters)) {
        if (key === 'search' || value === null || value === undefined || value === '') {
          continue;
        }

        // Handle date range filters
        if (key.endsWith('_from')) {
          const baseColumn = key.slice(0, -5);
          if (typeof value === 'string' && value.trim()) {
            conditions.push({ [baseColumn]: { $gte: new Date(value.trim()) } });
          }
          continue;
        }

        if (key.endsWith('_to')) {
          const baseColumn = key.slice(0, -3);
          if (typeof value === 'string' && value.trim()) {
            let dateValue = value.trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
              dateValue = `${dateValue}T23:59:59.999Z`;
            }
            conditions.push({ [baseColumn]: { $lte: new Date(dateValue) } });
          }
          continue;
        }

        // Handle boolean string values
        if (value === 'true' || value === 'false') {
          conditions.push({ [key]: value === 'true' });
        } else if (typeof value === 'string' && value.trim()) {
          // Text filter with regex
          conditions.push({ [key]: { $regex: value.trim(), $options: 'i' } });
        }
      }
    }

    // Combine conditions
    const filter: Filter<Document> = conditions.length > 0 ? { $and: conditions } : {};

    // Build sort
    const sort: Sort = orderBy
      ? { [orderBy]: orderDirection === 'desc' ? -1 : 1 }
      : { _id: -1 };

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const cursor = collection.find(filter).sort(sort).skip(skip).limit(limit);

    const docs = await cursor.toArray();
    const items = docs.map((doc) => this.convertDocument(doc));

    // Get total count
    const total = await collection.countDocuments(filter);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================
  // Raw Query (Aggregation Pipeline)
  // ============================================

  async query<T = Record<string, unknown>>(
    collectionName: string,
    pipeline?: unknown[]
  ): Promise<QueryResult<T>> {
    await this.ensureConnected();

    const collection = this.db!.collection(collectionName);

    // If no pipeline provided, just find all
    if (!pipeline || pipeline.length === 0) {
      const docs = await collection.find({}).toArray();
      return {
        rows: docs.map((doc) => this.convertDocument(doc)) as T[],
        rowCount: docs.length,
      };
    }

    // Run aggregation pipeline
    const docs = await collection.aggregate(pipeline as Document[]).toArray();

    return {
      rows: docs.map((doc) => this.convertDocument(doc)) as T[],
      rowCount: docs.length,
    };
  }

  // ============================================
  // Transaction Support
  // ============================================

  async beginTransaction(): Promise<TransactionContext> {
    await this.ensureConnected();

    const session = this.client!.startSession();
    session.startTransaction();

    return {
      commit: async () => {
        try {
          await session.commitTransaction();
        } finally {
          await session.endSession();
        }
      },
      rollback: async () => {
        try {
          await session.abortTransaction();
        } finally {
          await session.endSession();
        }
      },
    };
  }

  // ============================================
  // Utility Methods
  // ============================================

  buildParameterPlaceholder(_index: number): string {
    // MongoDB doesn't use parameter placeholders in the same way
    return '?';
  }

  escapeIdentifier(name: string): string {
    // MongoDB field names don't need escaping in the same way
    return name;
  }

  mapTypeToFieldType(nativeType: string): FieldType {
    const typeMap: Record<string, FieldType> = {
      String: 'text',
      Number: 'number',
      Boolean: 'boolean',
      Date: 'datetime',
      ObjectId: 'uuid',
      Array: 'array',
      Object: 'json',
      BinData: 'binary',
      Mixed: 'json',
    };

    return typeMap[nativeType] ?? 'text';
  }

  buildPaginationClause(
    _limitParamIndex: number,
    limit: number,
    offset: number = 0
  ): { clause: string; params: unknown[]; nextIndex: number } {
    // MongoDB doesn't use SQL clauses, but we implement this for interface compatibility
    // The actual pagination is done via skip() and limit() in MongoDB queries
    return {
      clause: '',
      params: [limit, offset],
      nextIndex: _limitParamIndex + 2,
    };
  }

  // ============================================
  // Private Methods
  // ============================================

  private async ensureConnected(): Promise<void> {
    if (!this.client || !this.db) {
      await this.connect();
    }
  }

  private buildFilter(where: Record<string, unknown>): Filter<Document> {
    const filter: Filter<Document> = {};

    for (const [key, value] of Object.entries(where)) {
      if (value === null) {
        filter[key] = null;
      } else if (key === '_id' || key === 'id') {
        // Handle ObjectId conversion for _id
        filter._id = this.toObjectId(value);
      } else {
        filter[key] = value;
      }
    }

    return filter;
  }

  private buildIdFilter(id: string | number): Filter<Document> {
    return { _id: this.toObjectId(id) };
  }

  private toObjectId(id: unknown): ObjectId | unknown {
    if (id instanceof ObjectId) {
      return id;
    }

    if (typeof id === 'string') {
      try {
        return new ObjectId(id);
      } catch {
        return id; // Keep as string if not a valid ObjectId
      }
    }

    return id;
  }

  private convertDocument(doc: WithId<Document>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(doc)) {
      if (value instanceof ObjectId) {
        result[key] = value.toString();
      } else if (value instanceof Date) {
        result[key] = value.toISOString();
      } else if (Buffer.isBuffer(value)) {
        result[key] = value.toString('base64');
      } else if (Array.isArray(value)) {
        result[key] = value.map((item) =>
          item instanceof ObjectId
            ? item.toString()
            : item instanceof Date
              ? item.toISOString()
              : item
        );
      } else if (value !== null && typeof value === 'object') {
        result[key] = this.convertDocument(value as WithId<Document>);
      } else {
        result[key] = value;
      }
    }

    return result;
  }
}

/**
 * Create a new MongoDB adapter
 */
export function createMongoDBAdapter(config: AdapterConfig): MongoDBAdapter {
  return new MongoDBAdapter(config);
}
