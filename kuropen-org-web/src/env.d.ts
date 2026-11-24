/// <reference path="../worker-configuration.d.ts" />
/// <reference types="vite-plugin-svgr/client" />

declare namespace Cloudflare {
    interface Env {
        HCAPTCHA_SECRET_KEY: string;
        PHARE_API_KEY: string;
    }
}

interface Env extends Cloudflare.Env {}
