import { QdrantClient } from '@qdrant/js-client-rest';

export class QdrantService {
  private static instance: QdrantClient | null = null;

  static getInstance(): QdrantClient {
    if (!QdrantService.instance) {
      QdrantService.instance = new QdrantClient({
        url: process.env.QDRANT_URL || 'http://localhost:6333',
        apiKey: process.env.QDRANT_API_KEY,
      });
    }
    return QdrantService.instance;
  }

  static async ensureCollection(
    collectionName: string,
    vectorSize: number,
    distance: 'Cosine' | 'Euclid' | 'Dot' = 'Cosine'
  ): Promise<void> {
    const client = QdrantService.getInstance();
    
    try {
      await client.getCollection(collectionName);
    } catch (error) {
      // Collection doesn't exist, create it
      await client.createCollection(collectionName, {
        vectors: {
          size: vectorSize,
          distance,
        },
        optimizers_config: {
          default_segment_number: 2,
        },
      });

      // Note: Field indexes are created automatically by Qdrant for payload fields
import { QdrantClient } from '@qdrant/js-client-rest';

export class QdrantService {
  private static instance: QdrantClient | null = null;

  static getInstance(): QdrantClient {
    if (!QdrantService.instance) {
      QdrantService.instance = new QdrantClient({
        url: process.env.QDRANT_URL || 'http://localhost:6333',
        apiKey: process.env.QDRANT_API_KEY,
      });
    }
    return QdrantService.instance;
  }

  static async ensureCollection(
    collectionName: string,
    vectorSize: number,
    distance: 'Cosine' | 'Euclid' | 'Dot' = 'Cosine'
  ): Promise<void> {
    const client = QdrantService.getInstance();
    
    try {
      await client.getCollection(collectionName);
    } catch (error) {
      // Collection doesn't exist, create it
      await client.createCollection(collectionName, {
        vectors: {
          size: vectorSize,
          distance,
        },
        optimizers_config: {
          default_segment_number: 2,
        },
      });

      // Note: Field indexes are created automatically by Qdrant for payload fields
      // when they are first used in filters. Manual index creation is not required
      await client.createFieldIndex(collectionName, {
        field_name: 'project_id',
        field_schema: 'keyword',
      });

      await client.createFieldIndex(collectionName, {
        field_name: 'source_id',
        field_schema: 'keyword',
      });

      await client.createFieldIndex(collectionName, {
        field_name: 'document_id',
        field_schema: 'keyword',
      });
    }
  }

  static async upsertVectors(
    collectionName: string,
    points: Array<{
      id: string | number;
      vector: number[];
      payload?: Record<string, any>;
    }>
  ): Promise<void> {
    const client = QdrantService.getInstance();
    await client.upsert(collectionName, {
      wait: true,
      points,
    });
  }

  static async search(
    collectionName: string,
    vector: number[],
    limit: number = 10,
    filter?: Record<string, any>,
    scoreThreshold?: number
  ) {
    const client = QdrantService.getInstance();
    return await client.search(collectionName, {
      vector,
      limit,
      filter,
      score_threshold: scoreThreshold,
      with_payload: true,
      with_vector: false,
    });
  }

  static async deleteByFilter(
    collectionName: string,
    filter: Record<string, any>
  ): Promise<void> {
    const client = QdrantService.getInstance();
    await client.delete(collectionName, {
      wait: true,
      filter,
    });
  }

  static async getPoints(
    collectionName: string,
    ids: (string | number)[]
  ) {
    const client = QdrantService.getInstance();
    return await client.retrieve(collectionName, {
      ids,
      with_payload: true,
      with_vector: false,
    });
  }
}

export const qdrant = QdrantService.getInstance();

export interface VectorSearchOptions {
  projectId: string;
  query: number[];
  limit?: number;
  scoreThreshold?: number;
  sourceIds?: string[];
  metadata?: Record<string, any>;
}

export class VectorStore {
  private collectionName: string;
  private vectorSize: number;

  constructor(collectionName: string = 'chatbot_embeddings', vectorSize: number = 1536) {
    this.collectionName = collectionName;
    this.vectorSize = vectorSize;
  }

  async initialize(): Promise<void> {
    await QdrantService.ensureCollection(this.collectionName, this.vectorSize);
  }

  async addDocumentChunks(
    chunks: Array<{
      id: string;
      content: string;
      embedding: number[];
      documentId: string;
      sourceId: string;
      projectId: string;
      metadata?: Record<string, any>;
    }>
  ): Promise<void> {
    const points = chunks.map((chunk) => ({
      id: chunk.id,
      vector: chunk.embedding,
      payload: {
        content: chunk.content,
        document_id: chunk.documentId,
        source_id: chunk.sourceId,
        project_id: chunk.projectId,
        ...chunk.metadata,
      },
    }));

    await QdrantService.upsertVectors(this.collectionName, points);
  }

  async search(options: VectorSearchOptions) {
    const filter: any = {
      must: [
        {
          key: 'project_id',
          match: { value: options.projectId },
        },
      ],
    };

    if (options.sourceIds && options.sourceIds.length > 0) {
      filter.must.push({
        key: 'source_id',
        match: { any: options.sourceIds },
      });
    }

    if (options.metadata) {
      Object.entries(options.metadata).forEach(([key, value]) => {
        filter.must.push({
          key,
          match: { value },
        });
      });
    }

    return await QdrantService.search(
      this.collectionName,
      options.query,
      options.limit || 10,
      filter,
      options.scoreThreshold
    );
  }

  async deleteByDocument(documentId: string): Promise<void> {
    await QdrantService.deleteByFilter(this.collectionName, {
      must: [
        {
          key: 'document_id',
          match: { value: documentId },
        },
      ],
    });
  }

  async deleteBySource(sourceId: string): Promise<void> {
    await QdrantService.deleteByFilter(this.collectionName, {
      must: [
        {
          key: 'source_id',
          match: { value: sourceId },
        },
      ],
    });
  }

  async deleteByProject(projectId: string): Promise<void> {
    await QdrantService.deleteByFilter(this.collectionName, {
      must: [
        {
          key: 'project_id',
          match: { value: projectId },
        },
      ],
    });
  }
}

export const vectorStore = new VectorStore();