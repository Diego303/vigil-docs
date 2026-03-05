import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const docsSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  order: z.number().optional(),
  icon: z.string().optional(),
});

export const collections = {
  docs: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/docs' }),
    schema: docsSchema,
  }),
  'docs-en': defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/docs-en' }),
    schema: docsSchema,
  }),
};
