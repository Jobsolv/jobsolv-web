import { defineCollection, z } from "astro:content";

export const collections = {
  blog: defineCollection({
    schema: z.object({
      title: z.string(),
      slug: z.string().optional(),
      description: z.string().optional(),
      pubDate: z.coerce.date().optional(),
      updatedDate: z.coerce.date().optional(),
      category: z.string().nullable().optional(),
      tags: z
        .object({
          role: z.array(z.string()).optional(),
          intent: z.array(z.string()).optional(),
        })
        .optional(),
      canonical: z.string().url().optional(),
      draft: z.boolean().optional(),
      archived: z.boolean().optional(),
    }),
  }),
};
