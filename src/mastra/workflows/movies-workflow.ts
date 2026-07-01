import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

const getMovies = createStep({
  id: 'get-movies',
  description: 'Fetches movie recommendations based on user preferences',
  inputSchema: {
    query: z.string().describe('User query for movies'),
  },
  outputSchema: z.object({
    moviesPlan: z.string(),
  }),
  execute: async ({ inputData, mastra }) => {
    const { query } = inputData as { query: string };

    if (!query) {
      throw new Error('Movie query not found');
    }

    const agent = mastra?.getAgent('elasticsearchAgent');
    if (!agent) {
      throw new Error('Elasticsearch agent not found');
    }

    const response = await agent.stream([
      {
        role: 'user',
        content: query,
      },
    ]);

    let moviesText = '';

    for await (const chunk of response.textStream) {
      process.stdout.write(chunk);
      moviesText += chunk;
    }

    return {
      moviesPlan: moviesText,
    };
  },
});

const approve = createStep({
  id: 'approve',
  inputSchema: z.object({
    moviesPlan: z.string(),
  }),
  outputSchema: z.object({
    approved: z.boolean(),
    output: z.string(),
  }),
  resumeSchema: z.object({
    confirm: z.boolean(),
  }),
  suspendSchema: z.object({
    reason: z.string(),
  }),
  execute: async ({ inputData, resumeData, suspend, bail }) => {
    const { confirm: approved } = resumeData ?? {}

    if (approved === false) {
      return bail({
        reason: '',
      })
    }

    if (!approved) {
      return await suspend({
        reason: `Are you ready, Jerry?`,
      })
    }

    return {
      approved: true,
      output: `Are you watching closely?`,
    }
  },
})

const moviesWorkflow = createWorkflow({
  id: 'movies-workflow',
  inputSchema: z.object({
    query: z.string().describe('User query for movies'),
  }),
  outputSchema: z.object({
    activities: z.string(),
  }),
})
  .then(getMovies)
  .then(approve);

moviesWorkflow.commit();

export { moviesWorkflow };
