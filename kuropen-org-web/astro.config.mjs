// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()]
  },
  adapter: vercel(),
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