/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: [
    "plugin:astro/recommended",
    "prettier",
    "plugin:tailwindcss/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    tsconfigRootDir: __dirname,
    sourceType: "module",
    ecmaVersion: "latest",
  },
  overrides: [
    {
      files: ["*.astro"],
      parser: "astro-eslint-parser",
      parserOptions: {
        parser: "@typescript-eslint/parser",
        extraFileExtensions: [".astro"],
      },
      rules: {
        "tailwindcss/no-custom-classname": 1,
      },
    },
  ],
};
