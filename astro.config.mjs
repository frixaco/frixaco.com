// @ts-check

import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { defineConfig, fontProviders } from "astro/config";

import tailwindcss from "@tailwindcss/vite";

import vercel from "@astrojs/vercel";

// https://astro.build/config
export default defineConfig({
  site: "https://astro.frixaco.com",
  output: "server",

  prefetch: {
    defaultStrategy: "load",
  },

  integrations: [mdx(), sitemap()],

  vite: {
    plugins: [tailwindcss()],
  },

  adapter: vercel(),
  experimental: {
    fonts: [
      {
        provider: fontProviders.google(),
        name: "IBM Plex Mono",
        cssVariable: "--font-mono",
        weights: ["light", "regular", "medium", "semibold", "bold"],
      },
    ],
  },
});
