/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      boxShadow: {
        solid: '2px 2px 0'
      },
      dropShadow: {
        solid: '2px 2px 0px hsl(0, 0%, 0%)'
      },
      colors: {
        primary: 'hsl(0deg 0% 9.02%)'
      }
    }
  },
  plugins: []
}
