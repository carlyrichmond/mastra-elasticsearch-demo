import { z } from 'zod';
import { createCompletenessScorer , createToolCallAccuracyScorerCode, createAnswerRelevancyScorer } from '@mastra/evals/scorers/prebuilt';
import {
  getAssistantMessageFromRunOutput,
  getUserMessageFromRunInput,
} from '@mastra/evals/scorers/utils';
import { createScorer } from '@mastra/core/evals';

export const toolCallAppropriatenessScorer = createToolCallAccuracyScorerCode({
  expectedTool: 'vectorQueryTool',
  strictMode: false,
});

export const completenessScorer = createCompletenessScorer();

export const answerRelevancyScorer = createAnswerRelevancyScorer({
  model: {
    providerId: "azure-openai",
    modelId: "gpt-4o",
    url: process.env.OPENAI_URL,
    apiKey: process.env.OPENAI_API_KEY
  }
});

// Custom LLM-judged scorer: evaluates if agent returns their thinking process along with the final answer
export const thinkingScorer = createScorer({
  id: 'thinking-scorer',
  name: 'Thinking Process Evaluation',
  description:
    'Checks that the agent returns their thinking process along with the final answer',
  type: 'agent',
  judge: {
    model: {
    providerId: "azure-openai",
    modelId: "gpt-4o",
    url: process.env.OPENAI_URL,
    apiKey: process.env.OPENAI_API_KEY
  },
    instructions:
      'You are an expert evaluator of LLM responses. ' +
      'Determine whether the agent has returned their thinking process along with the final answer. ' +
      'Return only the structured JSON matching the provided schema.',
  },
})
  .preprocess(({ run }) => {
    const userText = getUserMessageFromRunInput(run.input) || '';
    const assistantText = getAssistantMessageFromRunOutput(run.output) || '';
    return { userText, assistantText };
  })
  .analyze({
    description:
      'Evaluate if the agent has returned their thinking process along with the final answer',
    outputSchema: z.object({
      confidence: z.number().min(0).max(1).default(1),
      explanation: z.string().default(''),
    }),
    createPrompt: ({ results }) => `
            You are evaluating if the agent has returned their thinking process along with the final answer.
            User text:
            """
            ${results.preprocessStepResult.userText}
            """
            Assistant response:
            """
            ${results.preprocessStepResult.assistantText}
            """
            Tasks:
            1) Make sure the thinking process in the assistant response is comprehensive and logical.
            2) Ensure it only includes relevant information to the user query.
            3) Also make sure it returns a concise final set of movie recommendations at the end of the response.
            4) Make sure no extraneous information is included that was not part of the original response.
            Return JSON with fields:
            {
            "confidence": number, // 0-1
            "explanation": string
            }
        `,
  })
  .generateScore(({ results }) => {
    const r = (results as any)?.analyzeStepResult || {};
    return Math.max(0, Math.min(1, 0.7 + 0.3 * (r.confidence ?? 1)));
  })
  .generateReason(({ results, score }) => {
    const r = (results as any)?.analyzeStepResult || {};
    return `Thinking score: confidence=${r.confidence ?? 0}. Score=${score}. ${r.explanation ?? ''}`;
  });

export const scorers = {
  toolCallAppropriatenessScorer,
  completenessScorer,
  answerRelevancyScorer,
  thinkingScorer,
};
