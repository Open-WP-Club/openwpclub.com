import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { file, glob } from 'astro/loaders';

const plugins = defineCollection({
  // Track the generated catalog as a real content dependency so Astro reloads
  // categories and release assets whenever fetch-data changes the JSON file.
  loader: file('src/data/plugins.json'),
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
    releasePublishedAt: z.string().default(''),
    releaseUrl: z.string().default(''),
    releaseDownloads: z.number().default(0),
    releaseAssets: z.array(z.object({
      name: z.string(),
      url: z.string().refine((url) => url.startsWith('https://'), 'release asset URL must start with https://'),
      size: z.number(),
      downloadCount: z.number(),
      contentType: z.string(),
    })).default([]),
    platforms: z.array(z.enum(['windows', 'macos', 'linux', 'android', 'ios'])).default([]),
    featured: z.boolean().default(false),
    icon: z.string().default(''),
    features: z.array(z.string()).default([]),
    requirements: z.array(z.string()).default([]),
    screenshots: z.array(z.object({
      src: z.string(),
      alt: z.string(),
      caption: z.string().optional(),
    })).default([]),
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
