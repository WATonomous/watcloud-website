import type { MdxFile } from 'nextra'
import { getPageMap } from 'nextra/page-map'
import { BlogIndexClient, BlogPostSummary } from './blog'

// Server component that reads blog posts from the page map and renders the client-side index.
export async function BlogIndex() {
    const pageMap = await getPageMap('/blog')
    const posts: BlogPostSummary[] = pageMap
        .filter((item): item is MdxFile => 'route' in item && !('children' in item))
        .map((page) => ({
            route: page.route,
            name: page.name,
            frontMatter: page.frontMatter || {},
        }))

    return <BlogIndexClient posts={posts} />
}
