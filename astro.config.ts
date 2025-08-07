// @ts-check
import { defineConfig } from "astro/config"

import mdx from "@astrojs/mdx"

import vercel from "@astrojs/vercel"

import tailwindcss from "@tailwindcss/vite"

// https://astro.build/config
export default defineConfig({
	output: "static",
	integrations: [mdx()],

	adapter: vercel({
		webAnalytics: { enabled: true },
	}),

	vite: {
		plugins: [tailwindcss()],
	},
})
