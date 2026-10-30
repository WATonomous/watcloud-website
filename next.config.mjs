import { fileURLToPath } from 'node:url'
import nextra from 'nextra'
import { withSentryConfig } from "@sentry/nextjs/config"
import withBundleAnalyzer from "@next/bundle-analyzer"

const FIXTURES_DIR = fileURLToPath(new URL('./build/fixtures/', import.meta.url))

// Original Next.js config
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  images: {
    // output: export doesn't support Next.js image optimization
    unoptimized: true,
  },
  // Next.js doesn't support trailing slashes in basePath
  // This config needs to be in sync with export-images.config.js
  basePath: (process.env.WEBSITE_BASE_PATH || '').replace(/\/$/, ""),
  eslint: {
    dirs: [
      'app',
      'content',
      'components',
      'lib',
      'mdx-components.tsx',
      "tailwind.config.js",
      "next.config.mjs",
      "postcss.config.js",
    ]
  },
  webpack(config, { defaultLoaders }) {
    // Nextra walks the whole git history for every MDX file that isn't in it: https://github.com/shuding/nextra/issues/4781
    const mdxRule = config.module.rules.find(rule => rule?.oneOf && String(rule.test) === String(/\.mdx?$/))
    const nextraLoader = mdxRule?.oneOf.at(-1).use.at(-1)
    if (!nextraLoader?.loader?.endsWith('loader.cjs')) {
      throw new Error("Nextra's MDX rule not found, update the fixture rule in next.config.mjs")
    }
    mdxRule.exclude = FIXTURES_DIR
    config.module.rules.push({
      test: /\.mdx$/,
      include: FIXTURES_DIR,
      use: [defaultLoaders.babel, {
        loader: fileURLToPath(new URL('./scripts/mdx-fixture-loader.cjs', import.meta.url)),
        options: nextraLoader.options,
      }],
    })
    return config
  },
}

// Add Nextra config
const withNextra = nextra({
  defaultShowCopyCode: true,
  latex: true, // LaTeX support: https://nextra.site/docs/guide/advanced/latex
  mdxOptions: {
    rehypePrettyCodeOptions: {
      // Available themes: https://shiki.style/themes
      theme: {
        dark: 'github-dark-dimmed',
        light: 'github-light',
      },
    },
  },
});

// Apply all the wrappers
let finalConfig = withNextra(nextConfig)

// Add Sentry config
finalConfig = withSentryConfig(finalConfig, {
  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/build/

  // Suppresses source map uploading logs during build
  silent: false,

  // These variables are set in CI to enable source map uploading
  org: process.env.WATCLOUD_WEBSITE_SENTRY_ORG,
  project: process.env.WATCLOUD_WEBSITE_SENTRY_PROJECT,
  authToken: process.env.WATCLOUD_WEBSITE_SENTRY_AUTH_TOKEN,

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Routes browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers (increases server load)
  // tunnelRoute: "/monitoring",

  // Removes source maps from the build output after uploading them
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  webpack: {
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});

// Add bundle analyzer config
const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default bundleAnalyzer(finalConfig);