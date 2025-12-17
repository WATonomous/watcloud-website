import { allImages } from '@/build/fixtures/images';
import CommentSection from '@/components/giscus-comments';
import { Badge } from "@/components/ui/badge";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { userProfiles, websiteConfig } from '@/lib/data';
import { dayjsTz } from '@/lib/utils';
import { GithubIcon, LinkIcon, LinkedinIcon, MailIcon, XIcon } from 'lucide-react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Link, useConfig } from "nextra-theme-docs";
import React, { Fragment } from 'react';
import { SubscribeDialog } from './blog';
import Picture from './picture';
import { SocialLinks } from './ui/social-links';

// Reference for styling: https://github.com/vercel/turbo/blob/22585c9dcc23eb010ab01f177394358af03210d7/docs/pages/blog/turbo-1-10-0.mdx

// Derived from https://github.com/vercel/turbo/blob/22585c9dcc23eb010ab01f177394358af03210d7/docs/components/blog/Date.tsx
function Date({
    children,
}: {
    children: React.ReactNode;
    update?: string;
}) {
    return (
        <div className="text-sm mt-2 text-center text-gray-500 dark:text-gray-400">
            {children}
        </div>
    );
}

export function Avatar({ username }: { username: string }) {
    const image = allImages[`user-${username}`];
    if (!image) {
        throw new Error(`No image found for username: ${username}`);
    }
    if (!(username in userProfiles)) {
        throw new Error(`No profile found for username: ${username}`);
    }

    const profile = (userProfiles as any)[username];

    return (
        <div className="flex items-center flex-shrink-0 md:justify-start">
            <div className="w-[32px] h-[32px]">
                <Picture image={image} alt={username} imgClassName="w-full rounded-full" />
            </div>
            <dl className="ml-2 text-sm font-medium leading-4 text-left whitespace-no-wrap">
                <dt className="sr-only">Name</dt>
                <dd className="text-gray-800 dark:text-slate-50">{profile.watcloud_public_profile.full_name}</dd>
                {profile.watcloud_public_profile.links && (
                    <SocialLinks links={profile.watcloud_public_profile.links} />
                )}
            </dl>
        </div>
    );
}

export function BlogPostHeader() {
    const { frontMatter } = useConfig();
    const router = useRouter();

    const { title, date, timezone, authors, reviewers, description } = frontMatter;
    const { locale = websiteConfig.default_locale } = router
    const dateObj = date && timezone && dayjsTz(date, timezone).toDate()

    // Get the base URL dynamically from the current origin
    // Fallback to a default for SSR/static generation
    const getBaseUrl = () => {
        if (typeof window !== 'undefined') {
            return window.location.origin;
        }
        // Fallback for SSR/static generation - can be overridden via env var
        return process.env.NEXT_PUBLIC_BASE_URL || 'https://cloud.watonomous.ca';
    };
    
    const baseUrl = getBaseUrl();
    const basePath = router.basePath || '';

    // Get title image for Open Graph
    let titleImage: typeof allImages[string] | undefined;
    let ogImageUrl: string | undefined;
    if (frontMatter.title_image) {
        // prefer wide image, fallback to square
        const titleImageKey = frontMatter.title_image.wide || frontMatter.title_image.square;
        titleImage = allImages[titleImageKey];
        if (!titleImage) {
            throw new Error(`Cannot find image with key: ${titleImageKey}`);
        }
        
        // Construct absolute URL for Open Graph image
        // Use the JPG version for maximum compatibility
        const imagePath = titleImage.jpg.src;
        
        // Extract just the /_next/... portion from the image path, ignoring any deployment preview paths
        let normalizedImagePath: string;
        if (imagePath.startsWith('http')) {
            ogImageUrl = imagePath;
        } else {
            // Find the /_next/ part in the path and extract everything from there
            const nextIndex = imagePath.indexOf('/_next/');
            if (nextIndex !== -1) {
                // Extract from /_next/ onwards
                normalizedImagePath = imagePath.substring(nextIndex);
            } else {
                // Fallback: use the path as-is if /_next/ not found
                normalizedImagePath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
            }
            ogImageUrl = `${baseUrl}${normalizedImagePath}`;
        }
    }

    // Construct absolute URL for the current page
    const pageUrl = `${baseUrl}${basePath}${router.asPath}`;

    let titleImageComponent;
    if (frontMatter.title_image && titleImage) {
        const titleImageAttribution = frontMatter.title_image.attribution;
        if (!titleImageAttribution) {
            throw new Error(`No attribution found for title_image: ${JSON.stringify(frontMatter.title_image)}`);
        }

        titleImageComponent = (
            <Popover>
                <PopoverTrigger className="block mx-auto my-8">
                    <Picture
                        image={titleImage}
                        alt={titleImageAttribution}
                        // The title images are either square or wide.
                        // On small screens (viewport width < viewport height), the width is the constraint and the image looks nice by default (w-full).
                        // On larger screens (viewport width > viewport height), we want to make sure
                        // the image is not too tall, so we constrain the height.
                        // w-auto is used to make sure the image doesn't get stretched.
                        imgClassName='md:h-96 md:w-auto'
                    />
                </PopoverTrigger>
                <PopoverContent side='bottom' className="w-96 max-w-full">
                    <div className="text-xs text-center text-gray-500 dark:text-gray-400">
                        {titleImageAttribution}
                    </div>
                </PopoverContent>
            </Popover>
        )
    }

    return (
        <>
            <Head>
                {/* Open Graph / Facebook */}
                <meta property="og:type" content="article" />
                <meta property="og:title" content={title} />
                <meta property="og:site_name" content="WATcloud" />
                {description && <meta property="og:description" content={description} />}
                {ogImageUrl && <meta property="og:image" content={ogImageUrl} />}
                <meta property="og:url" content={pageUrl} />
                
                {/* Twitter */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={title} />
                {description && <meta name="twitter:description" content={description} />}
                {ogImageUrl && <meta name="twitter:image" content={ogImageUrl} />}
            </Head>
            {titleImageComponent}
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{title}</h1>
            {dateObj && (
                <Date>
                    {/* suppressHydrationWarning is used to prevent warnings due to differing server/client locales */}
                    <time dateTime={dateObj.toISOString()} suppressHydrationWarning>
                        {dateObj.toLocaleDateString(locale, {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                        })}
                    </time>
                </Date>
            )}
            {frontMatter.tags && frontMatter.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                    {frontMatter.tags.map((tag: string) => (
                        <Link href={`/blog?tag=${tag}`} key={tag} className="no-underline">
                            <Badge variant="secondary">{tag}</Badge>
                        </Link>
                    ))}
                </div>
            )}
            <div className="w-full border-b border-gray-400 authors border-opacity-20">
                <div className="flex justify-center mt-8 mb-2 mx-auto gap-14">
                    {authors && authors.length > 0 && (
                        <div className="text-center">
                            <div className="flex justify-center mb-2 text-sm text-gray-500 dark:text-gray-400">Written By</div>
                            <div className="flex flex-wrap justify-center mb-8 gap-7">
                                {authors.map((author: string) => (
                                    <Avatar key={author} username={author} />
                                ))}
                            </div>
                        </div>

                    )}
                    {reviewers && reviewers.length > 0 && (
                        <div className="text-center">
                            <div className="flex justify-center mb-2 text-sm text-gray-500 dark:text-gray-400">Reviewed By</div>
                            <div className="flex flex-wrap justify-center mb-8 gap-7">
                                {reviewers.map((reviewer: string) => (
                                    <Avatar key={reviewer} username={reviewer} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}

export function BlogPostFooter() {
    return <>
        <SubscribeDialog />
        <div className="mt-16"/>
        <CommentSection />
    </>
}
