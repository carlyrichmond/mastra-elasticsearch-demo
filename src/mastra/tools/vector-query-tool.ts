import { ElasticSearchVector } from '@mastra/elasticsearch';
import { createVectorQueryTool } from '@mastra/rag';
import { ModelRouterEmbeddingModel } from "@mastra/core/llm";

const es_url = process.env.ELASTICSEARCH_URL;
if (!es_url) {
  throw new Error("ELASTICSEARCH_URL is not defined");
}
const es_apikey = process.env.ELASTICSEARCH_API_KEY;
if (!es_apikey) {
  throw new Error("ELASTICSEARCH_API_KEY is not defined");
}
const es_index_name = process.env.ELASTICSEARCH_INDEX_NAME;
if (!es_index_name) {
  throw new Error("ELASTICSEARCH_INDEX_NAME is not defined");
}

const esVector = new ElasticSearchVector({
  id: 'elasticsearch-vector',
  url: es_url,
  auth: {
    apiKey : es_apikey
  }
});

export const vectorQueryTool = createVectorQueryTool({
  vectorStore: esVector,
  indexName: es_index_name,
  enableFilter: true,
  model: new ModelRouterEmbeddingModel({
    providerId: "azure-openai",
    modelId: "text-embedding-3-small",
    url: process.env.OPENAI_URL,
    apiKey: process.env.OPENAI_API_KEY
  }),
  reranker: {
    model: 'gpt-5.4-nano',
    options: {
      weights: {
        semantic: 0.5, // Semantic relevance weight
        vector: 0.3, // Vector similarity weight
        position: 0.2, // Original position weight
      },
      topK: 5,
    },
  }
});