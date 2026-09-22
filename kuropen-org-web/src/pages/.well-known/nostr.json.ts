import type { APIRoute } from "astro";
import { z } from "astro/zod";

type Nip05Response = {
    names: {
        [K: string]: string
    };
    relays?: {
        [K: string]: string[]
    };
}

const NOSTR_PUBLIC_KEY_HEX = '1beb09ed61b223a74caa53d31a1c64d919cfd32e8f933bca9807ddd4a9e470c0';
const availableHandles = ["_", "kuropen"];
const getNames = (desination: string | null) => {
    const names: Nip05Response["names"] = {};
    const targetHandles = desination ? availableHandles.filter((handle) => handle === desination) : availableHandles;
    targetHandles.forEach((handle) => {
        names[handle] = NOSTR_PUBLIC_KEY_HEX;
    })
    return names;
}
const Nip05Params = z.object({
    name: z.enum(availableHandles).nullable(),
})

export const prerender = false;

export const GET = (async ({ url }) => {
    const parsedParams = Nip05Params.parse({name: url.searchParams.get('name')});
    const nip05Response: Nip05Response = {
        names: getNames(parsedParams.name),
    }
    return new Response(JSON.stringify(nip05Response), {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
    })
}) satisfies APIRoute;
