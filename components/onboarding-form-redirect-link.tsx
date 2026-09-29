'use client'

import { encodeURI as b64EncodeURI } from 'js-base64'
import { Link } from 'nextra-theme-docs'
import { INITIAL_FORM_DATA_QUERY_PARAM } from '@/lib/onboarding-form'
import { SearchParamsProps, withSearchParams } from '@/components/with-search-params'

// Links to the new onboarding form location, carrying over form data from the legacy `initialFormData` query param.
function RedirectLinkImpl({ children, searchParams }: { children: React.ReactNode } & SearchParamsProps) {
    const initialFormDataStr = searchParams?.get('initialFormData');

    const newURLParams = new URLSearchParams();
    if (initialFormDataStr) {
        newURLParams.append(INITIAL_FORM_DATA_QUERY_PARAM, b64EncodeURI(initialFormDataStr));
    }
    const newURLParamsStr = newURLParams.toString();

    return <Link href={`/docs/utilities/onboarding-form${newURLParamsStr ? `?${newURLParamsStr}` : ""}`}>{children}</Link>
}

export const RedirectLink = withSearchParams(RedirectLinkImpl);
