// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import cloudflare from "@astrojs/cloudflare";

import react from "@astrojs/react";

import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: 'https://kuropen.org',

  vite: {
    plugins: [tailwindcss()]
  },

  fonts: [
    {
      provider: fontProviders.bunny(),
      name: "IBM Plex Sans JP",
      cssVariable: "--font-ibm-plex-sans-jp",
    }
  ],

  redirects: {
    "/ja": {
      status: 301,
      destination: "/"
    },
    "/en": {
      status: 301,
      destination: "/"
    },
    "/contact/form": {
      status: 301,
      destination: "https://inquiry.kuropen.org/"
    },
    "/legal": {
      status: 301,
      destination: "/privacy"
    },
    "/pgn-archives": {
      status: 303,
      destination: "/",
    },
  },

  adapter: cloudflare(),
  integrations: [react(), sitemap()]
});
