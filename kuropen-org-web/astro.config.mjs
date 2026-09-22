// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()]
  },
  adapter: node({
    mode: 'standalone'
  }),
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: "IBM Plex Sans JP",
      cssVariable: "--font-ibm-plex-sans-jp",
    }
  ],
  redirects: {
    "/contact/form": {
      status: 301,
      destination: "https://inquiry.kuropen.org/"
    },
  }
});