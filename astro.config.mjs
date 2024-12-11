// @ts-check
import { defineConfig } from "astro/config"

import tailwind from "@astrojs/tailwind"

import mdx from "@astrojs/mdx"

import vercel from "@astrojs/vercel"

// https://astro.build/config
export default defineConfig({
	output: "static",
	integrations: [tailwind(), mdx()],
	adapter: vercel({
		webAnalytics: { enabled: true },
	}),
})
