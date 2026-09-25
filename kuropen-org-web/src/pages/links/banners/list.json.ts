import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

export const GET = (async () => {
    const bannersCollection = await getCollection('banners')

    const banners: {key: string, size: string, src: string}[] = 
        bannersCollection.map((banner) => ({
            key: banner.id,
            size: banner.data.sizeText,
            src: banner.data.image.src,
        }))
    return new Response(JSON.stringify({banners}));
}) satisfies APIRoute;
