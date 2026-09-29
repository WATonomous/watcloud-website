import { generateStaticParamsFor, importPage } from 'nextra/pages'
import { BlogPostFooter, BlogPostHeader } from '@/components/blog-post'
import { getBlogPostMetadata, isBlogPost } from '@/lib/blog'
import { useMDXComponents as getMDXComponents } from '@/mdx-components'

type PageProps = {
  params: Promise<{ mdxPath?: string[] }>
}

export const generateStaticParams = generateStaticParamsFor('mdxPath')

export async function generateMetadata(props: PageProps) {
  const { mdxPath } = await props.params
  const { metadata } = await importPage(mdxPath)

  if (isBlogPost(mdxPath)) {
    return {
      ...metadata,
      ...getBlogPostMetadata(metadata, `/${mdxPath!.join('/')}`),
    }
  }

  return metadata
}

const Wrapper = getMDXComponents().wrapper

export default async function Page(props: PageProps) {
  const params = await props.params
  const { default: MDXContent, toc, metadata, sourceCode } = await importPage(params.mdxPath)
  const blogPost = isBlogPost(params.mdxPath)

  return (
    <Wrapper toc={toc} metadata={metadata} sourceCode={sourceCode}>
      {blogPost && <BlogPostHeader frontMatter={metadata} />}
      <MDXContent {...props} params={params} />
      {blogPost && <><BlogPostFooter /><div className="mt-16" /></>}
    </Wrapper>
  )
}
