import { ModelRouterEmbeddingModel } from "@mastra/core/llm";
import { ElasticSearchVector } from "@mastra/elasticsearch";
import "dotenv/config";

import {
  elasticsearchUrl,
  elasticsearchApiKey,
  elasticsearchIndexName,
} from "./consts";

if (!elasticsearchUrl || !elasticsearchApiKey || !elasticsearchIndexName) {
  throw new Error(
    "Please set ELASTICSEARCH_URL, ELASTICSEARCH_API_KEY, and ELASTICSEARCH_INDEX_NAME environment variables.",
  );
}

// Connect to Elasticsearch
const vectorStore = new ElasticSearchVector({
  id: "elasticsearch-vector",
  url: elasticsearchUrl,
  auth: {
    apiKey: elasticsearchApiKey,
  },
});

try {
  const indexes = await vectorStore.listIndexes();
  if (!indexes.includes(elasticsearchIndexName)) {
    throw new Error(`Index ${elasticsearchIndexName} does not exist`);
  }
  console.log(`✅ Index ${elasticsearchIndexName} exists`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.log(`ℹ️ ${message}`);
}

const openaiEmbeddingModel = new ModelRouterEmbeddingModel({
  providerId: "azure-openai",
  modelId: "text-embedding-3-small",
  url: process.env.OPENAI_URL,
  apiKey: process.env.OPENAI_API_KEY,
});

// Search for sci-fi movies
const searchMovies = async () => {
  const query = "Sci-fi movies with a strong female lead";
  const { embeddings: batchEmbeddings } = await openaiEmbeddingModel.doEmbed({
    values: [query],
  });
  const embedding = batchEmbeddings[0];
  console.log(`✅ Embedding generated for query "${query}"`);

  const results = await vectorStore.query({
    indexName: elasticsearchIndexName!,
    queryVector: embedding,
    topK: 10,
    filter: { director: "Roger Vadim" },
  });

  if (results.length === 0) {
    console.log(`❌ No results found for query "${query}"`);
    return;
  } else {
    console.log(`✅ ${results.length} results found for query "${query}"`);
  }


  let i = 1;
  for (const result of results) {
    const line = `[${i}] Title: ${result.metadata!.title}, Director: ${result.metadata!.director}, Score: ${result.score}`;
    console.log(line);
    i++;
  }
};

await searchMovies();
