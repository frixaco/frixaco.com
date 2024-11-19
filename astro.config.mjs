// @ts-check
import { defineConfig } from "astro/config"

import tailwind from "@astrojs/tailwind"

import mdx from "@astrojs/mdx"

import vercel from "@astrojs/vercel/serverless"

// https://astro.build/config
export default defineConfig({
	output: "hybrid",
	integrations: [tailwind(), mdx()],
	adapter: vercel({
		webAnalytics: { enabled: true },
	}),
})
