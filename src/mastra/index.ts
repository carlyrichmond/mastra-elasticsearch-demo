
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { Observability, MastraStorageExporter, MastraPlatformExporter, SensitiveDataFilter } from '@mastra/observability';
import { moviesWorkflow } from './workflows/movies-workflow';
import { elasticsearchAgent } from './agents/elasticsearch-agent';
import { answerRelevancyScorer, completenessScorer, toolCallAppropriatenessScorer, thinkingScorer } from './scorers/relevance-scorer';

export const mastra = new Mastra({
  workflows: { moviesWorkflow },
  agents: { elasticsearchAgent },
  scorers: { toolCallAppropriatenessScorer, completenessScorer, answerRelevancyScorer, thinkingScorer },
  storage: new LibSQLStore({
    id: "mastra-storage",
    // stores observability, scores, ... into persistent file storage
    url: "file:./mastra.db",
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'mastra',
        exporters: [
          new MastraStorageExporter(), // Persists traces to storage for Mastra Studio
          new MastraPlatformExporter(), // Sends traces to Mastra Platform (if MASTRA_PLATFORM_ACCESS_TOKEN is set)
        ],
        spanOutputProcessors: [
          new SensitiveDataFilter(), // Redacts sensitive data like passwords, tokens, keys
        ],
      },
    },
  }),
});
