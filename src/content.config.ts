import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { readFileSync, existsSync } from 'node:fs';

const PLUGINS_CACHE = 'src/data/plugins.json';

const plugins = defineCollection({
  loader: async () => {
    if (!existsSync(PLUGINS_CACHE)) {
      console.warn('[plugins] src/data/plugins.json not found. Run "pnpm run fetch-data" first.');
      return [];
    }
    const cached = JSON.parse(readFileSync(PLUGINS_CACHE, 'utf-8'));
    console.log(`[plugins] Loaded ${cached.length} plugins from src/data/plugins.json`);
    return cached;
  },
  schema: z.object({
    name: z.string(),
    description: z.string(),
    version: z.string(),
    downloads: z.string(),
    rating: z.string(),
    githubUrl: z.string().refine((url) => url.startsWith('https://'), 'githubUrl must start with https://'),
    wordpressUrl: z.string().refine((url) => !url || url.startsWith('https://'), 'wordpressUrl must start with https://'),
    stars: z.number(),
    forks: z.number(),
    openIssues: z.number(),
    lastPush: z.string(),
    createdAt: z.string(),
    topics: z.array(z.string()),
    license: z.string().nullable(),
    language: z.string().nullable(),
    defaultBranch: z.string(),
    category: z.enum(['plugin', 'app', 'website', 'tool']).default('plugin'),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    author: z.string(),
    tags: z.array(z.string()).default([]),
    updated: z.coerce.date().optional(),
  }),
});

export const collections = { plugins, blog };
