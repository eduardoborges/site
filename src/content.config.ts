import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    draft: z.boolean().optional().default(false),
    slug: z.string().optional(),
    tags: z.array(z.string()).optional().default([]),
    description: z.string().optional(),
    tldr: z.string().optional(),
    hidden: z.boolean().optional().default(false),
  }),
});

export const collections = { posts };
