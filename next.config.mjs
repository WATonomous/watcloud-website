import nextra from 'nextra'
import { withSentryConfig } from '@sentry/nextjs'
import bundleAnalyzer from '@next/bundle-analyzer'
import fs from 'fs'
import path from 'path'

function convertMetaJsonToJs(dir) {
  const entries = fs.readdirSync(dir)
  for (const entry of entries) {
    const full = path.join(dir, entry)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) {
      convertMetaJsonToJs(full)
    } else if (entry === '_meta.json') {
      const jsPath = path.join(dir, '_meta.js')
      if (!fs.existsSync(jsPath)) {
        const jsonContent = fs.readFileSync(full, 'utf8')
        fs.writeFileSync(
          jsPath,
          `export default ${jsonContent.trim()}\n`,
          'utf8'
        )
      }
      // Remove the original JSON file to prevent Nextra from picking it up
      fs.unlinkSync(full)
    }
  }
}

convertMetaJsonToJs(path.join(process.cwd(), 'pages'))

// Base Next.js configuration
const baseConfig = {
  reactStrictMode: true,
  output: 'export',
  images: {
    // output: export doesn't support Next.js image optimization
    unoptimized: true,
  },
  // Next.js doesn't support trailing slashes in basePath
  // This config needs to be in sync with export-images.config.js
  basePath: (process.env.WEBSITE_BASE_PATH || '').replace(/\/$/, ''),
  webpack: (config) => {
    // Add TypeScript support (for .ts / .tsx in page imports outside `src`)
    // Reference: https://www.altogic.com/blog/nextjs-typescript
    config.resolve.extensions.push('.ts', '.tsx')
    return config
  },
  eslint: {
    dirs: [
      'pages',
      'src',
      'app',
      'components',
      'lib',
      'theme.config.tsx',
      'tailwind.config.js',
      'next.config.mjs',
      'postcss.config.js',
    ],
    // Skip ESLint during production builds to avoid blocking due to markdown/MDX files.
    ignoreDuringBuilds: true,
  },
  // Allow production builds to succeed even if there are TypeScript type errors.
  typescript: {
    ignoreBuildErrors: true,
  },
}

// Nextra (v3) plugin
const withNextra = nextra({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx',
  latex: true, // LaTeX support: https://nextra.site/docs/guide/advanced/latex
})

// Apply Nextra first
let config = withNextra(baseConfig)

// Sentry configuration
config = withSentryConfig(
  config,
  {
    // For all available options, see:
    // https://github.com/getsentry/sentry-webpack-plugin#options
    silent: false,

    // These variables are set in CI to enable source map uploading
    org: process.env.WATCLOUD_WEBSITE_SENTRY_ORG,
    project: process.env.WATCLOUD_WEBSITE_SENTRY_PROJECT,
    authToken: process.env.WATCLOUD_WEBSITE_SENTRY_AUTH_TOKEN,
  },
  {
    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    widenClientFileUpload: true,
    transpileClientSDK: true,
    // tunnelRoute: '/monitoring',
    hideSourceMaps: true,
    disableLogger: true,
  }
)

// Bundle Analyzer
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

export default withBundleAnalyzer(config)