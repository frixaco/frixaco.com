import eslint from "@eslint/js"
import tseslint from "typescript-eslint"
import eslintPluginAstro from "eslint-plugin-astro"
import tailwindcssPlugin from "eslint-plugin-tailwindcss"

export default tseslint.config(
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	...eslintPluginAstro.configs.recommended,
	...tailwindcssPlugin.configs["flat/recommended"],
	{
		rules: {
			"tailwindcss/classnames-order": "off",
		},
	},
)
