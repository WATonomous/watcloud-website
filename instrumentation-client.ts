// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { websiteConfig } from '@/lib/data'

// proportion of traces to send to Sentry
const TRACES_SAMPLE_RATE = 1.0

if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: websiteConfig.sentry_dsn,

    tracesSampler({ location }: { location?: { host: string } }) {
      // Not sure what traces don't have a location, but sample them just in case.
      if (!location) {
        return TRACES_SAMPLE_RATE;
      }

      // Only send traces to Sentry if the user is on the production domain
      if (!location.host.endsWith('watonomous.ca')) {
        return 0.0
      }

      // Do not send traces to Sentry if the user is in the preview environment
      if (location.host === 'rgw-preview.watonomous.ca') {
        return 0.0
      }

      return TRACES_SAMPLE_RATE;
    },

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,

    // TODO: reduce session sample rate in production if needed
    replaysSessionSampleRate: 1.0,
    replaysOnErrorSampleRate: 1.0,

    tunnel: websiteConfig.sentry_tunnel,

    integrations: [
      Sentry.replayIntegration(),
    ],
  });
}

// Export the required hook for navigation instrumentation
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;