import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';

const verifiedDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const events = defineCollection({
  loader: file('src/data/events.json'),
  schema: z.object({
    id: z.string(), name: z.string(), date: verifiedDate, time: z.string(),
    location: z.string(), distances: z.array(z.string()), organizer: z.string(),
    url: z.url(), verifiedDate,
  }),
});

const groups = defineCollection({
  loader: file('src/data/groups.json'),
  schema: z.object({
    id: z.string(), name: z.string(), schedule: z.string(), location: z.string(),
    pace: z.string().optional(), note: z.string().optional(), url: z.url(), verifiedDate,
    expiresDate: verifiedDate.optional(),
  }),
});

const routes = defineCollection({
  loader: file('src/data/routes.json'),
  schema: z.object({
    id: z.string(), name: z.string(), location: z.string(), distance: z.string().optional(),
    surface: z.string(), amenities: z.array(z.string()), safety: z.string().optional(),
    url: z.url(), verifiedDate,
  }),
});

const resources = defineCollection({
  loader: file('src/data/resources.json'),
  schema: z.object({
    id: z.string(), name: z.string(), category: z.string(), location: z.string(),
    description: z.string(), url: z.url(), verifiedDate,
  }),
});

export const collections = { events, groups, routes, resources };
