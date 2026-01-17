// Original Next.js config
module.exports = {
  reactStrictMode: true,
  output: 'export',
  images: {
    // output: export doesn't support Next.js image optimization
    unoptimized: true,
  },
  // Next.js doesn't support trailing slashes in basePath
  // This config needs to be in sync with export-images.config.js
  basePath: (process.env.WEBSITE_BASE_PATH || '').replace(/\/$/, ""),
  webpack: (config) => {
    // Add Typescript support
    // Reference: https://www.altogic.com/blog/nextjs-typescript
    config.resolve.extensions.push(".ts", ".tsx");
    return config;
  },
  eslint: {
    dirs: [
      'pages',
      'src',
      'app',
      'components',
      'lib',
      'theme.config.tsx',
      "tailwind.config.js",
      "next.config.js",
      "postcss.config.js",
    ]
  }
}

// Add Nextra config
const withNextra = require('nextra').default({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx',
  latex: true, // LaTeX support: https://nextra.site/docs/guide/advanced/latex
});
  
module.exports = withNextra(module.exports)

// Add Sentry config
const { withSentryConfig } = require("@sentry/nextjs");

module.exports = withSentryConfig(
  module.exports,
  {
    // For all available options, see:
    // https://github.com/getsentry/sentry-webpack-plugin#options

    // Suppresses source map uploading logs during build
    silent: false,
    
    // These variables are set in CI to enable source map uploading
    org: process.env.WATCLOUD_WEBSITE_SENTRY_ORG,
    project: process.env.WATCLOUD_WEBSITE_SENTRY_PROJECT,
    authToken: process.env.WATCLOUD_WEBSITE_SENTRY_AUTH_TOKEN,
  },
  {
    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Transpiles SDK to be compatible with IE11 (increases bundle size)
    transpileClientSDK: true,

    // Routes browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers (increases server load)
    // tunnelRoute: "/monitoring",

    // Hides source maps from generated client bundles
    hideSourceMaps: true,

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,
  }
);

// Add bundle analyzer config
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

module.exports = withBundleAnalyzer(module.exports);