/// <reference path="../worker-configuration.d.ts" />

declare namespace Cloudflare {
    interface Env {
        TURNSTILE_SECRET_KEY: string;
    }
}

interface Env extends Cloudflare.Env {}
