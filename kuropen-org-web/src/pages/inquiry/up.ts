import type { APIRoute } from "astro";

export const GET = (async () => {
    return new Response("It works!", {
        headers: {
            "content-type": "text/plain",
        }
    });
}) satisfies APIRoute;
