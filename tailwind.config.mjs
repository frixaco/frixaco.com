import typography from "@tailwindcss/typography"

/** @type {import('tailwindcss').Config} */
export default {
	content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
	theme: {
		extend: {
			fontFamily: {
				// sans: ["Manrope", ...defaultTheme.fontFamily.sans],
				// sans: ["Plus Jakarta Sans", ...defaultTheme.fontFamily.sans],
			},
			boxShadow: {
				solid: "2px 2px 0",
			},
			dropShadow: {
				solid: "2px 2px 0px hsl(0, 0%, 0%)",
			},
			colors: {
				primary: "hsl(0deg 0% 9.02%)",
			},
		},
	},
	plugins: [
		typography,
		function ({ addBase, addUtilities }) {
			addBase({
				"*": {
					minWidth: "0",
				},
			})
			addUtilities({
				".scrollbar-hidden": {
					"&::-webkit-scrollbar": {
						display: "none",
					},
					"scrollbar-width": "none",
					"-ms-overflow-style": "none",
				},
			})
		},
	],
}
