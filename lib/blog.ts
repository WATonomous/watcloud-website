import type { Metadata } from 'next'
import { allImages } from '@/build/fixtures/images'

// Used to construct absolute URLs for Open Graph tags. Can be overridden via env var.
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://cloud.watonomous.ca'
const BASE_PATH = (process.env.WEBSITE_BASE_PATH || '').replace(/\/$/, '')

export function isBlogPost(mdxPath: string[] | undefined) {
    return mdxPath?.length === 2 && mdxPath[0] === 'blog'
}

// Open Graph and Twitter tags for blog posts
export function getBlogPostMetadata(frontMatter: Record<string, any>, route: string): Metadata {
    const { title, description } = frontMatter

    let ogImageUrl: string | undefined
    if (frontMatter.title_image) {
        // prefer wide image, fallback to square
        const titleImageKey = frontMatter.title_image.wide || frontMatter.title_image.square
        const titleImage = allImages[titleImageKey]
        if (!titleImage) {
            throw new Error(`Cannot find image with key: ${titleImageKey}`)
        }

        // Use the JPG version for maximum compatibility
        const imagePath: string = titleImage.jpg.src

        if (imagePath.startsWith('http')) {
            ogImageUrl = imagePath
        } else {
            // Extract just the /_next/... portion from the image path, ignoring any deployment preview paths
            const nextIndex = imagePath.indexOf('/_next/')
            const normalizedImagePath = nextIndex !== -1
                ? imagePath.substring(nextIndex)
                : (imagePath.startsWith('/') ? imagePath : `/${imagePath}`)
            ogImageUrl = `${BASE_URL}${normalizedImagePath}`
        }
    }

    return {
        openGraph: {
            type: 'article',
            title,
            siteName: 'WATcloud',
            description,
            images: ogImageUrl,
            url: `${BASE_URL}${BASE_PATH}${route}`,
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: ogImageUrl,
        },
    }
}
