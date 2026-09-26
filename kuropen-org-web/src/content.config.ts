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

const redirctedArchives = defineCollection({
    loader: file("src/data/redirected_archives.json"),
    schema: z.object({
        title: z.string(),
        old_path: z.string(),
        new_url: z.url(),
        created_at: z.string(), // 日付として処理しない
        updated_at: z.string(), // 日付として処理しない
    }),
})

export const collections = {
    links,
    banners,
    redirctedArchives,
}
