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
    "/posts/[...slug]": {
      status: 301,
      destination: "/pgn-archives/[...slug]"
    },
    "/articles/[...slug]": {
      status: 301,
      destination: "/pgn-archives/[...slug]"
    },
    "/blog/[...slug]": {
      status: 301,
      destination: "/pgn-archives/[...slug]"
    },
    "/ja": {
      status: 301,
      destination: "/"
    },
    "/en": {
      status: 301,
      destination: "/"
    },
    "/ja/posts/[...path]": {
      status: 301,
      destination: "/pgn-archives/[...path]"
    },
    "/en/posts/[...path]": {
      status: 301,
      destination: "/pgn-archives/[...path]"
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
