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

const projects = defineCollection({
    loader: file("src/data/projects.yaml"),
    schema: () => z.object({
        name: z.string(),
        url: z.url(),
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

const statusPages = defineCollection({
    loader: file("src/data/status_pages.yaml"),
    schema: z.object({
        phare_pj_id: z.int(),
        phare_sp_id: z.int(),
        project_name: z.string(),
        status_page: z.url(),
    }),
})

export const collections = {
    links,
    banners,
    redirctedArchives,
    projects,
    statusPages,
}
