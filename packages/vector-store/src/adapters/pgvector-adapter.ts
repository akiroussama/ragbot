import { Pool, PoolClient } from 'pg';
import {
  VectorStoreAdapter,
  VectorDocument,
  SearchResult,
  SearchOptions,
  UpsertOptions,
  CollectionInfo,
  VectorStoreStats,
} from '../types';
import { Logger } from '@nestjs/common';

export interface PgVectorConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  schema?: string;
  tablePrefix?: string;
  maxConnections?: number;
}

export class PgVectorAdapter implements VectorStoreAdapter {
  public readonly name = 'pgvector';
  private readonly logger = new Logger(PgVectorAdapter.name);
  private pool: Pool;
  private config: PgVectorConfig;
  private schema: string;

  constructor(config: PgVectorConfig) {
    this.config = config;
    this.schema = config.schema || 'public';
    
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl,
      max: config.maxConnections || 20,
    });
  }

  async initialize(): Promise<void> {
    try {
      const client = await this.pool.connect();
      
      // Enable pgvector extension
      await client.query('CREATE EXTENSION IF NOT EXISTS vector');
      
      // Create schema if it doesn't exist
      if (this.schema !== 'public') {
        await client.query(`CREATE SCHEMA IF NOT EXISTS ${this.schema}`);
      }
      
      client.release();
      this.logger.log('PgVector client initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize PgVector client', error);
      throw new Error(`PgVector initialization failed: ${error.message}`);
    }
  }

  async createCollection(
    name: string,
    dimensions: number,
    options: any = {},
  ): Promise<void> {
    const tableName = this.getTableName(name);
    const client = await this.pool.connect();
    
    try {
      // Create table for the collection
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.schema}.${tableName} (
          id TEXT PRIMARY KEY,
          vector vector(${dimensions}),
          content TEXT,
          metadata JSONB DEFAULT '{}',
          tenant_id TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      
      // Create indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS ${tableName}_vector_idx 
        ON ${this.schema}.${tableName} 
        USING ivfflat (vector ${options.indexType || 'vector_cosine_ops'})
        WITH (lists = ${options.lists || 100})
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS ${tableName}_tenant_idx 
        ON ${this.schema}.${tableName} (tenant_id)
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS ${tableName}_metadata_idx 
        ON ${this.schema}.${tableName} USING GIN (metadata)
      `);
      
      this.logger.log(`Created PgVector table: ${tableName}`);
    } catch (error) {
      throw new Error(`Failed to create table ${tableName}: ${error.message}`);
    } finally {
      client.release();
    }
  }

  async deleteCollection(name: string): Promise<void> {
    const tableName = this.getTableName(name);
    const client = await this.pool.connect();
    
    try {
      await client.query(`DROP TABLE IF EXISTS ${this.schema}.${tableName}`);
      this.logger.log(`Deleted PgVector table: ${tableName}`);
    } catch (error) {
      throw new Error(`Failed to delete table ${tableName}: ${error.message}`);
    } finally {
      client.release();
    }
  }

  async upsert(
    collectionName: string,
    documents: VectorDocument[],
    options: UpsertOptions = {},
  ): Promise<void> {
    const tableName = this.getTableName(collectionName);
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      for (const doc of documents) {
        await client.query(
          `
          INSERT INTO ${this.schema}.${tableName} 
          (id, vector, content, metadata, tenant_id, updated_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
          ON CONFLICT (id) 
          DO UPDATE SET 
            vector = EXCLUDED.vector,
            content = EXCLUDED.content,
            metadata = EXCLUDED.metadata,
            tenant_id = EXCLUDED.tenant_id,
            updated_at = NOW()
          `,
          [
            doc.id,
            JSON.stringify(doc.vector),
            doc.content,
            JSON.stringify(doc.metadata),
            doc.tenantId,
          ],
        );
      }
      
      await client.query('COMMIT');
      this.logger.debug(`Upserted ${documents.length} documents to ${tableName}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to upsert documents to ${tableName}: ${error.message}`);
    } finally {
      client.release();
    }
  }

  async search(
    collectionName: string,
    queryVector: number[],
    options: SearchOptions = {},
  ): Promise<SearchResult[]> {
    const tableName = this.getTableName(collectionName);
    const client = await this.pool.connect();
    
    try {
      let whereClause = '';
      const params: any[] = [JSON.stringify(queryVector)];
      let paramIndex = 2;
      
      const conditions: string[] = [];
      
      if (options.tenantId) {
        conditions.push(`tenant_id = $${paramIndex}`);
        params.push(options.tenantId);
        paramIndex++;
      }
      
      if (options.filter) {
        for (const [key, value] of Object.entries(options.filter)) {
          if (Array.isArray(value)) {
            conditions.push(`metadata->>'${key}' = ANY($${paramIndex})`);
            params.push(value.map(String));
          } else if (typeof value === 'object' && value !== null) {
            if (value.gte !== undefined) {
              conditions.push(`(metadata->>'${key}')::numeric >= $${paramIndex}`);
              params.push(value.gte);
              paramIndex++;
            }
            if (value.lte !== undefined) {
              conditions.push(`(metadata->>'${key}')::numeric <= $${paramIndex}`);
              params.push(value.lte);
              paramIndex++;
            }
          } else {
            conditions.push(`metadata->>'${key}' = $${paramIndex}`);
            params.push(String(value));
          }
          paramIndex++;
        }
      }
      
      if (conditions.length > 0) {
        whereClause = `WHERE ${conditions.join(' AND ')}`;
      }
      
      const distanceFunction = this.getDistanceFunction(options.metric || 'cosine');
      const orderBy = `ORDER BY vector ${distanceFunction} $1`;
      const limit = `LIMIT ${options.limit || 10}`;
      
      const selectFields = options.includeVectors 
        ? 'id, content, metadata, tenant_id, vector'
        : 'id, content, metadata, tenant_id';
      
      const query = `
        SELECT ${selectFields},
               1 - (vector ${distanceFunction} $1) as score
        FROM ${this.schema}.${tableName}
        ${whereClause}
        ${orderBy}
        ${limit}
      `;
      
      const result = await client.query(query, params);
      
      return result.rows
        .map((row) => ({
          id: row.id,
          score: row.score,
          content: row.content,
          metadata: row.metadata || {},
          tenantId: row.tenant_id,
          vector: row.vector ? JSON.parse(row.vector) : undefined,
        }))
        .filter((result) => {
          return options.scoreThreshold === undefined || result.score >= options.scoreThreshold;
        });
    } catch (error) {
      throw new Error(`Failed to search in table ${tableName}: ${error.message}`);
    } finally {
      client.release();
    }
  }

  async delete(
    collectionName: string,
    ids: string[],
    options: any = {},
  ): Promise<void> {
    const tableName = this.getTableName(collectionName);
    const client = await this.pool.connect();
    
    try {
      await client.query(
        `DELETE FROM ${this.schema}.${tableName} WHERE id = ANY($1)`,
        [ids],
      );
      
      this.logger.debug(`Deleted ${ids.length} documents from ${tableName}`);
    } catch (error) {
      throw new Error(`Failed to delete documents from ${tableName}: ${error.message}`);
    } finally {
      client.release();
    }
  }

  async batchUpsert(
    collectionName: string,
    documents: VectorDocument[],
    batchSize: number = 100,
    options: UpsertOptions = {},
  ): Promise<void> {
    const batches = this.chunkArray(documents, batchSize);
    
    for (let i = 0; i < batches.length; i++) {
      await this.upsert(collectionName, batches[i], options);
      this.logger.debug(`Processed batch ${i + 1}/${batches.length}`);
    }
  }

  async getCollectionInfo(name: string): Promise<CollectionInfo> {
    const tableName = this.getTableName(name);
    const client = await this.pool.connect();
    
    try {
      // Get table info
      const tableInfo = await client.query(`
        SELECT 
          c.column_name,
          c.data_type,
          c.character_maximum_length
        FROM information_schema.columns c
        WHERE c.table_schema = $1 AND c.table_name = $2
          AND c.column_name = 'vector'
      `, [this.schema, tableName]);
      
      if (tableInfo.rows.length === 0) {
        throw new Error(`Table ${tableName} not found`);
      }
      
      // Get row count
      const countResult = await client.query(
        `SELECT COUNT(*) as count FROM ${this.schema}.${tableName}`,
      );
      
      // Get table size
      const sizeResult = await client.query(`
        SELECT pg_total_relation_size('${this.schema}.${tableName}') as size
      `);
      
      return {
        name: tableName,
        dimensions: 0, // Would need to parse vector type
        documentCount: parseInt(countResult.rows[0].count),
        indexedCount: parseInt(countResult.rows[0].count),
        storageSize: parseInt(sizeResult.rows[0].size),
      };
    } catch (error) {
      throw new Error(`Failed to get table info for ${tableName}: ${error.message}`);
    } finally {
      client.release();
    }
  }

  async listCollections(): Promise<string[]> {
    const client = await this.pool.connect();
    
    try {
      const prefix = this.config.tablePrefix ? `${this.config.tablePrefix}_` : '';
      
      const result = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = $1
          AND table_type = 'BASE TABLE'
          AND EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = $1
              AND table_name = tables.table_name
              AND column_name = 'vector'
              AND data_type = 'USER-DEFINED'
          )
      `, [this.schema]);
      
      return result.rows
        .map((row) => row.table_name)
        .filter((name) => !prefix || name.startsWith(prefix))
        .map((name) => prefix ? name.substring(prefix.length) : name);
    } catch (error) {
      throw new Error(`Failed to list tables: ${error.message}`);
    } finally {
      client.release();
    }
  }

  async getStats(): Promise<VectorStoreStats> {
    const client = await this.pool.connect();
    
    try {
      const collections = await this.listCollections();
      let totalDocuments = 0;
      let totalStorageSize = 0;
      
      for (const collection of collections) {
        try {
          const tableName = this.getTableName(collection);
          
          const countResult = await client.query(
            `SELECT COUNT(*) as count FROM ${this.schema}.${tableName}`,
          );
          
          const sizeResult = await client.query(`
            SELECT pg_total_relation_size('${this.schema}.${tableName}') as size
          `);
          
          totalDocuments += parseInt(countResult.rows[0].count);
          totalStorageSize += parseInt(sizeResult.rows[0].size);
        } catch (error) {
          this.logger.warn(`Failed to get stats for collection ${collection}`, error);
        }
      }
      
      return {
        totalCollections: collections.length,
        totalDocuments,
        totalStorageSize,
        provider: this.name,
      };
    } catch (error) {
      throw new Error(`Failed to get PgVector stats: ${error.message}`);
    } finally {
      client.release();
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch (error) {
      this.logger.error('PgVector health check failed', error);
      return false;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  private getTableName(name: string): string {
    return this.config.tablePrefix ? `${this.config.tablePrefix}_${name}` : name;
  }

  private getDistanceFunction(metric: string): string {
    switch (metric) {
      case 'cosine':
        return '<->';
      case 'euclidean':
      case 'l2':
        return '<->';
      case 'manhattan':
      case 'l1':
        return '<+>';
      case 'inner_product':
      case 'dot':
        return '<#>';
      default:
        return '<->';
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}