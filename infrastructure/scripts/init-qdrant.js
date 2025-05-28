const { QdrantClient } = require('@qdrant/js-client-rest');

async function initializeQdrant() {
  const client = new QdrantClient({
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY,
  });

  const collections = [
    {
      name: 'chatbot_embeddings',
      vectorSize: 1536, // OpenAI ada-002
      distance: 'Cosine',
    },
    {
      name: 'chatbot_embeddings_multilingual',
      vectorSize: 768, // Multilingual models
      distance: 'Cosine',
    },
  ];

  for (const collection of collections) {
    try {
      // Check if collection exists
      await client.getCollection(collection.name);
      console.log(`✅ Collection ${collection.name} already exists`);
    } catch (error) {
      // Create collection if it doesn't exist
      console.log(`📦 Creating collection ${collection.name}...`);
      await client.createCollection(collection.name, {
        vectors: {
          size: collection.vectorSize,
          distance: collection.distance,
        },
        optimizers_config: {
          default_segment_number: 2,
        },
        replication_factor: 2,
      });

      // Create indexes
      await client.createFieldIndex(collection.name, {
        field_name: 'project_id',
        field_schema: 'keyword',
      });

      await client.createFieldIndex(collection.name, {
        field_name: 'source_id',
        field_schema: 'keyword',
      });

      await client.createFieldIndex(collection.name, {
        field_name: 'document_id',
        field_schema: 'keyword',
      });

      console.log(`✅ Collection ${collection.name} created successfully`);
    }
  }
}

initializeQdrant()
  .then(() => {
    console.log('✅ Qdrant initialization complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Qdrant initialization failed:', error);
    process.exit(1);
  });