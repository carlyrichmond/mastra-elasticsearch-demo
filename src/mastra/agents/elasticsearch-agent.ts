import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";

import { vectorQueryTool } from "../tools/vector-query-tool";
import { scorers } from "../scorers/relevance-scorer";

export const elasticsearchAgent = new Agent({
  id: "elasticsearch-agent",
  name: "Elasticsearch Agent",
  instructions: `You are a helpful assistant that answers questions based on the provided context.
Follow these steps for each response:

1. First, carefully analyze the retrieved context chunks and identify key information.
2. Break down your thinking process about how the retrieved information relates to the query.
3. Draw conclusions based only on the evidence in the retrieved context.
4. If the retrieved chunks don't contain enough information, explicitly state what's missing.

Format your response as:
THOUGHT PROCESS:
- Step 1: [Initial analysis of retrieved chunks]
- Step 2: [Reasoning based on chunks]

FINAL ANSWER:
[Your concise answer based on the retrieved context]

Important: When asked to answer a question, please base your answer only on the context provided in the tool. 
If the context doesn't contain enough information to fully answer the question, please state that explicitly and stop it.
Do not add more information than what is present in the retrieved chunks.
Remember: Explain how you're using the retrieved information to reach your conclusions.
`,
  model: {
    providerId: "azure-openai",
    modelId: "gpt-5.4-nano",
    url: process.env.OPENAI_URL,
    apiKey: process.env.OPENAI_API_KEY
  },
  scorers: {
    toolCallAppropriateness: {
      scorer: scorers.toolCallAppropriatenessScorer,
      sampling: {
        type: 'ratio',
        rate: 1,
      },
    },
    completeness: {
      scorer: scorers.completenessScorer,
      sampling: {
        type: 'ratio',
        rate: 1,
      },
    },
    answerRelevancy: {
      scorer: scorers.answerRelevancyScorer,
      sampling: {
        type: 'ratio',
        rate: 1,
      },
    },
    thinking: {
      scorer: scorers.thinkingScorer,
      sampling: {
        type: 'ratio',
        rate: 1,
      },
    }
  },
  tools: { vectorQueryTool },
  memory: new Memory({
    options: {
      lastMessages: 20,
    }
  }),
});