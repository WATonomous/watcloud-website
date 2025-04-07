import { cn } from "@/lib/utils";
import { SiX } from "@icons-pack/react-simple-icons";
import { GithubIcon, GlobeIcon, LinkedinIcon, MailIcon } from "lucide-react";

import { Link } from "nextra-theme-docs";
import { Fragment } from "react";

export const DEFAULT_ICON_SIZE = 16;


export function SocialLink({
    link,
    iconSize = DEFAULT_ICON_SIZE
}: {
    link: string,
    iconSize?: number,
}) {
    let icon = <GlobeIcon size={iconSize} />;
    let sr = "link";
    if (link.startsWith("mailto:")) {
        icon = <MailIcon size={iconSize} />;
        sr = "email";
    } else if (link.startsWith("https://github.com") || link.startsWith("https://www.github.com")) {
        icon = <GithubIcon size={iconSize} />;
        sr = "github";
    } else if (link.startsWith("https://linkedin.com") || link.startsWith("https://www.linkedin.com")) {
        icon = <LinkedinIcon size={iconSize} />;
        sr = "linkedin";
    } else if (link.startsWith("https://twitter.com") || link.startsWith("https://x.com") ||
        link.startsWith("https://www.twitter.com") || link.startsWith("https://www.x.com")) {
        icon = <SiX size={iconSize} />;
        sr = "twitter";
    }
    return (
        <Fragment key={link}>
            <dt className="sr-only">{sr}</dt>
            <dd className="inline-block">
                <Link
                    className="text-xs hover:text-gray-900 dark:hover:text-white"
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {icon}
                </Link>
            </dd>
        </Fragment>
    )
}

export function SocialLinks({
    links,
    className,
    iconSize = DEFAULT_ICON_SIZE
}: {
    links: string[],
    className?: string,
    iconSize?: number,
}) {
    return (
        <div className={cn(className)}>
            {links.filter((link) => link).map((link) => <SocialLink key={link} link={link} iconSize={iconSize} />)}
        </div>
    )
}