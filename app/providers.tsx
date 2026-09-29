'use client'

// Custom polyfills not yet available in `next-core`:
// https://github.com/vercel/next.js/issues/58242
// https://nextjs.org/docs/architecture/supported-browsers#custom-polyfills
import 'core-js/features/array/to-reversed'
import 'core-js/features/array/to-spliced'
import 'core-js/features/array/to-sorted'

import { useReportWebVitals } from 'next/web-vitals'
import { GoogleAnalytics, sendGAEvent } from "@next/third-parties/google";
import { websiteConfig } from '@/lib/data'

type WebVitalsMetric = Parameters<Parameters<typeof useReportWebVitals>[0]>[0]

function reportWebVitals({ id, name, value }: WebVitalsMetric) {
    // Report web vitals to Google Analytics: https://nextjs.org/docs/app/api-reference/functions/use-report-web-vitals
    sendGAEvent("event", name, {
        event_category: "Web Vitals",
        value: Math.round(name === "CLS" ? value * 1000 : value), // values must be integers
        event_label: id, // id unique to current page load
        non_interaction: true, // avoids affecting bounce rate.
    });
}

export function Providers() {
    useReportWebVitals(reportWebVitals)

    return (
        // Page views on client-side navigation are tracked by GA4 enhanced measurement
        <GoogleAnalytics gaId={websiteConfig.ga_measurement_id} />
    )
}
