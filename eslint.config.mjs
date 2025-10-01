import { defineConfig, globalIgnores } from "eslint/config";
import * as mdx from 'eslint-plugin-mdx'
import react from 'eslint-plugin-react';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import eslintConfigPrettier from "eslint-config-prettier/flat";
import { FlatCompat } from '@eslint/eslintrc'

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
})

export default defineConfig([
  // Next (including Core Web Vitals and React Hooks) and Prettier Support (via FlatCompat)
  ...compat.config({
    extends: ['next/core-web-vitals', 'prettier'],
  }),

  // MDX Support
  {
    ...mdx.flat,
    processor: mdx.createRemarkProcessor({
      lintCodeBlocks: true,
      languageMapper: {},
    }),
    rules: {
      // Allow unescaped quotes and apostrophes in MDX content
      "react/no-unescaped-entities": "off",
    },
  },
  {
    ...mdx.flatCodeBlocks,
    rules: {
      'no-var': 'error',
      'prefer-const': 'error',
    }
  },

  // React Support
  {
    files: ['**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}'],
    ...react.configs.flat.recommended,
    languageOptions: {
      globals: {
        ...globals.serviceworker,
        ...globals.browser,
      },
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/no-unknown-property": [
        2,
        {
          "ignore": [
            // Allows for <style jsx>
            "jsx",
            // Allows for cmdk library attributes
            "cmdk-input-wrapper"
          ]
        }
      ],
    },
  },

  // Global Ignores
  globalIgnores([
    "**/node_modules/**",
    ".next/**",
    "dist/**",
    "build/**",
    "/components/ui/**", // Imported components from shadcn
  ]),
])