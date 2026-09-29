'use client'

import { ReadonlyURLSearchParams, useSearchParams } from 'next/navigation'
import { ComponentType, Suspense } from 'react'

export type SearchParamsProps = {
    // null while the search params are unavailable (during static export and before hydration)
    searchParams: ReadonlyURLSearchParams | null
}

// Provides search params to a component. During static export, the component is
// rendered with `searchParams: null`, similar to `router.isReady === false` in the Pages Router.
// https://nextjs.org/docs/app/api-reference/functions/use-search-params#static-rendering
export function withSearchParams<P extends object>(Component: ComponentType<P & SearchParamsProps>) {
    function WithSearchParams(props: P) {
        const searchParams = useSearchParams()
        return <Component {...props} searchParams={searchParams} />
    }

    return function SearchParamsBoundary(props: P) {
        return (
            <Suspense fallback={<Component {...props} searchParams={null} />}>
                <WithSearchParams {...props} />
            </Suspense>
        )
    }
}
