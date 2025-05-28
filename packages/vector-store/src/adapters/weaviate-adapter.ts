import weaviate, { WeaviateClient, ApiKey } from 'weaviate-ts-client';
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

export interface WeaviateConfig {
  scheme: 'http' | 'https';
  host: string;
  apiKey?: string;
  classPrefix?: string;
  headers?: Record<string, string>;
}

export class WeaviateAdapter implements VectorStoreAdapter {
  public readonly name = 'weaviate';
  private readonly logger = new Logger(WeaviateAdapter.name);
  private client: WeaviateClient;
  private config: WeaviateConfig;

  constructor(config: WeaviateConfig) {
    this.config = config;
    
    const clientConfig: any = {
      scheme: config.scheme,
      host: config.host,
    };
    
    if (config.apiKey) {
      clientConfig.authClientSecret = new ApiKey(config.apiKey);
    }
    
    if (config.headers) {
      clientConfig.headers = config.headers;
    }
    
    this.client = weaviate.client(clientConfig);
  }

  async initialize(): Promise<void> {
    try {
      await this.client.schema.getter().do();
      this.logger.log('Weaviate client initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Weaviate client', error);
      throw new Error(`Weaviate initialization failed: ${error.message}`);
    }
  }

  async createCollection(
    name: string,
    dimensions: number,
    options: any = {},
  ): Promise<void> {
    const className = this.getClassName(name);
    
    try {
      const classObj = {
        class: className,
        description: options.description || `Vector collection for ${name}`,
        vectorizer: 'none',
        properties: [
          {
            name: 'content',
            dataType: ['text'],
            description: 'The content of the document',
          },
          {
            name: 'tenantId',
            dataType: ['string'],
            description: 'Tenant identifier',
          },
          {
            name: 'metadata',
            dataType: ['object'],
            description: 'Document metadata',
          },
        ],
      };
      
      await this.client.schema.classCreator().withClass(classObj).do();
      
      this.logger.log(`Created Weaviate class: ${className}`);
    } catch (error) {
      if (error.message?.includes('already exists')) {
        this.logger.warn(`Class ${className} already exists`);
        return;
      }
      throw new Error(`Failed to create class ${className}: ${error.message}`);
    }
  }

  async deleteCollection(name: string): Promise<void> {
    const className = this.getClassName(name);
    
    try {
      await this.client.schema.classDeleter().withClassName(className).do();
      this.logger.log(`Deleted Weaviate class: ${className}`);
    } catch (error) {
      throw new Error(`Failed to delete class ${className}: ${error.message}`);
    }
  }

  async upsert(
    collectionName: string,
    documents: VectorDocument[],
    options: UpsertOptions = {},
  ): Promise<void> {
    const className = this.getClassName(collectionName);
    
    try {
      const batcher = this.client.batch.objectsBatcher();
      
      for (const doc of documents) {
        batcher.withObject({
          class: className,
          id: doc.id,
          vector: doc.vector,
          properties: {
            content: doc.content,
            tenantId: doc.tenantId,
            metadata: doc.metadata,
          },
        });
      }
      
      await batcher.do();
      
      this.logger.debug(`Upserted ${documents.length} documents to ${className}`);
    } catch (error) {
      throw new Error(`Failed to upsert documents to ${className}: ${error.message}`);
    }
  }

  async search(
    collectionName: string,
    queryVector: number[],
    options: SearchOptions = {},
  ): Promise<SearchResult[]> {
    const className = this.getClassName(collectionName);
    
    try {
      let query = this.client.graphql
        .get()
        .withClassName(className)
        .withFields('content tenantId metadata _additional { id score }')
        .withNearVector({ vector: queryVector })
        .withLimit(options.limit || 10);
      
      if (options.includeVectors) {
        query = query.withFields('content tenantId metadata _additional { id score vector }');
      }
      
      // Build where filter
      if (options.filter || options.tenantId) {
        const whereFilter: any = { operator: 'And', operands: [] };
        
        if (options.tenantId) {
          whereFilter.operands.push({
            path: ['tenantId'],
            operator: 'Equal',
            valueString: options.tenantId,
          });
        }
        
        if (options.filter) {
          for (const [key, value] of Object.entries(options.filter)) {
            if (Array.isArray(value)) {
              const orFilter = {
                operator: 'Or',
                operands: value.map((v) => ({
                  path: [`metadata.${key}`],
                  operator: 'Equal',
                  valueString: String(v),
                })),
              };
              whereFilter.operands.push(orFilter);
            } else {
              whereFilter.operands.push({
                path: [`metadata.${key}`],
                operator: 'Equal',
                valueString: String(value),
              });
            }
          }
        }
        
        if (whereFilter.operands.length > 0) {
          query = query.withWhere(whereFilter);
        }
      }
      
      const response = await query.do();
      const objects = response.data?.Get?.[className] || [];
      
      return objects.map((obj: any) => ({
        id: obj._additional.id,
        score: obj._additional.score || 0,
        content: obj.content || '',
        metadata: obj.metadata || {},
        tenantId: obj.tenantId,
        vector: obj._additional.vector as number[] | undefined,
      })).filter((result: SearchResult) => {
        return options.scoreThreshold === undefined || result.score >= options.scoreThreshold;
      });
    } catch (error) {
      throw new Error(`Failed to search in class ${className}: ${error.message}`);
    }
  }

  async delete(
    collectionName: string,
    ids: string[],
    options: any = {},
  ): Promise<void> {
    const className = this.getClassName(collectionName);
    
    try {
      for (const id of ids) {
        await this.client.data.deleter().withClassName(className).withId(id).do();
      }
      
      this.logger.debug(`Deleted ${ids.length} documents from ${className}`);
    } catch (error) {
      throw new Error(`Failed to delete documents from ${className}: ${error.message}`);
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
    const className = this.getClassName(name);
    
    try {
      const schema = await this.client.schema.getter().do();
      const classInfo = schema.classes?.find((cls: any) => cls.class === className);
      
      if (!classInfo) {
        throw new Error(`Class ${className} not found`);
      }
      
      // Get object count
      const response = await this.client.graphql
        .aggregate()
        .withClassName(className)
        .withFields('meta { count }')
        .do();
      
      const count = response.data?.Aggregate?.[className]?.[0]?.meta?.count || 0;
      
      return {
        name: className,
        dimensions: 0, // Weaviate doesn't expose vector dimensions easily
        documentCount: count,
        indexedCount: count,
        storageSize: 0, // Weaviate doesn't provide storage size
      };
    } catch (error) {
      throw new Error(`Failed to get class info for ${className}: ${error.message}`);
    }
  }

  async listCollections(): Promise<string[]> {
    try {
      const schema = await this.client.schema.getter().do();
      const prefix = this.config.classPrefix ? `${this.config.classPrefix}_` : '';
      
      return (schema.classes || [])
        .map((cls: any) => cls.class)
        .filter((name: string) => !prefix || name.startsWith(prefix))
        .map((name: string) => prefix ? name.substring(prefix.length) : name);
    } catch (error) {
      throw new Error(`Failed to list classes: ${error.message}`);
    }
  }

  async getStats(): Promise<VectorStoreStats> {
    try {
      const schema = await this.client.schema.getter().do();
      let totalDocuments = 0;
      
      for (const classInfo of schema.classes || []) {
        try {
          const response = await this.client.graphql
            .aggregate()
            .withClassName(classInfo.class)
            .withFields('meta { count }')
            .do();
          
          const count = response.data?.Aggregate?.[classInfo.class]?.[0]?.meta?.count || 0;
          totalDocuments += count;
        } catch (error) {
          this.logger.warn(`Failed to get stats for class ${classInfo.class}`, error);
        }
      }
      
      return {
        totalCollections: (schema.classes || []).length,
        totalDocuments,
        totalStorageSize: 0, // Weaviate doesn't provide storage size
        provider: this.name,
      };
    } catch (error) {
      throw new Error(`Failed to get Weaviate stats: ${error.message}`);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.misc.liveChecker().do();
      return true;
    } catch (error) {
      this.logger.error('Weaviate health check failed', error);
      return false;
    }
  }

  private getClassName(name: string): string {
    const className = this.config.classPrefix ? `${this.config.classPrefix}_${name}` : name;
    // Weaviate class names must start with uppercase
    return className.charAt(0).toUpperCase() + className.slice(1);
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}