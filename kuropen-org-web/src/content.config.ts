import { defineCollection } from "astro:content";
import { file } from "astro/loaders";
import { z } from "astro/zod";

const links = defineCollection({
    loader: file("src/data/links/index.yaml"),
    schema: ({ image }) => z.object({
        name: z.string(),
        url: z.url(),
        banner: image().optional(),
    }),
})

const banners = defineCollection({
    loader: file("src/data/banners/index.yaml"),
    schema: ({ image }) => z.object({
        sizeText: z.string(),
        image: image(),
    }),
})

export const collections = {
    links,
    banners,
}
