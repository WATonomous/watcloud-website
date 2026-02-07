import { DiscordIcon } from 'nextra/icons'
import { Bot, Heart, Code2 } from "lucide-react"
import websiteConfig from '@/build/fixtures/website-config.json'
import { Link } from "nextra-theme-docs"
import { BlogPostHeader, BlogPostFooter } from '@/components/blog-post'
import { useRouter } from 'next/router'

const logo = (
  // This logo is designed in Sketch, exported as SVG, and then manually adjusted based on
  // https://github.com/shuding/nextra/blob/66798f8e7f92cca80f2d62d19f9db5667bcc62ef/docs/theme.config.tsx
  // The original logo can be found in the corresponding pull requests. Please make sure to include
  // the logo in any pull requests that modify the logo.
  <svg height="50" viewBox="0 0 1024 512" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink">
    <title>WATcloud logo</title>
    <g id="1024x512" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
      <g id="Group" transform="translate(66, 115)">
        <g id="WAT" transform="translate(0, 62)" fill="currentColor" fillRule="nonzero">
          <polygon id="Path" points="250.7 0 197.34 161 165.6 161 125.81 41.86 85.33 161 53.36 161 0 0 31.05 0 71.07 122.36 112.7 0 140.3 0 181.01 123.05 222.18 0"></polygon>
          <path d="M378.547143,123.74 L298.047143,123.74 L282.177143,161 L251.357143,161 L323.807143,0 L353.247143,0 L425.927143,161 L394.647143,161 L378.547143,123.74 Z M368.657143,100.28 L338.297143,29.9 L308.167143,100.28 L368.657143,100.28 Z" id="Shape"></path>
          <polygon id="Path" points="475.114286 25.3 421.754286 25.3 421.754286 0 558.374286 0 558.374286 25.3 505.014286 25.3 505.014286 161 475.114286 161"></polygon>
        </g>
        <g id="cloud-symbol" transform="translate(587, 0)" stroke="currentColor" strokeWidth="25">
          <path d="M65,223 C29.0554438,222.729325 0,193.507794 0,157.5 C0,121.325349 29.3253489,92 65.5,92 C69.5073357,92 73.4306193,92.3598702 77.2392962,93.0490563 C80.8069488,41.0634253 124.108036,0 177,0 C232.228475,0 277,44.771525 277,100 C277,104.563616 276.694301,109.055832 276.102264,113.457288 C293.943444,123.474837 306,142.579439 306,164.5 C306,196.485571 280.329866,222.475561 248.467404,222.992163 L247.983,222.996 L65.501,223 L65,223 Z" id="icon"></path>
        </g>
      </g>
    </g>
    {/* Styles derived from https://github.com/shuding/nextra/blob/66798f8e7f92cca80f2d62d19f9db5667bcc62ef/docs/theme.config.tsx */}
    <style jsx>{`
      svg {
        // Override the height set on the svg element
        height: var(--nextra-navbar-height);
        mask-image: linear-gradient(
          60deg,
          black 25%,
          rgba(0, 0, 0, 0.2) 50%,
          black 75%
        );
        mask-size: 400%;
        mask-position: 0%;
      }
      svg:hover {
        mask-position: 100%;
        transition:
          mask-position 1s ease,
          -webkit-mask-position 1s ease;
      }
    `}</style>
  </svg>
)

const themeConfig = {
  logo,
  docsRepositoryBase: websiteConfig.docs_repository_base,
  feedback: {
    labels: "website"
  },
  chat: {
    icon: (
      <>
        <DiscordIcon />
        <span className="sr-only">Discord</span>
      </>
    ),
    link: `https://discord.gg/${websiteConfig.discord_invite_code}`
  },
  head: () => (
    <>
      <meta name="apple-mobile-web-app-title" content="WATcloud" />
      <title>WATcloud</title>
      <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      <link rel="icon" href="/favicon.png" type="image/png" />
      <link
        rel="icon"
        href="/favicon-dark.svg"
        type="image/svg+xml"
        media="(prefers-color-scheme: dark)"
      />
      <link
        rel="icon"
        href="/favicon-dark.png"
        type="image/png"
        media="(prefers-color-scheme: dark)"
      />
    </>
  ),
  footer: {
    content: (
      // Maybe create a footer component instead?
      // eg: map over FooterData.links, FooterData.icons
      <div className="w-full mx-auto max-w-screen-xl lg:flex lg:gap-x-20 lg:items-center lg:justify-between text-center lg:text-left">
        <span>
          Made with <Heart className="inline-block align-text-bottom" /> using <Code2 className="inline-block align-text-bottom" /> and <Bot className="inline-block align-text-bottom" /><br className="md:hidden" /> by the WATcloud team.
        </span>
        <ul className="flex flex-wrap justify-center items-start mt-8 lg:mt-0 text-sm font-medium text-gray-500 lg:flex-nowrap dark:text-gray-400 gap-6">
          <li>
            <Link href="https://groups.google.com/a/watonomous.ca/g/watcloud-compute-cluster-announcements" className="text-inherit no-underline hover:underline decoration-auto">
              Announcements
            </Link>
          </li>
          <li>
            <Link href="https://status.watonomous.ca" className="text-inherit no-underline hover:underline decoration-auto">
              Status
            </Link>
          </li>
          <li>
            <Link href="https://cloud.watonomous.ca/docs/utilities/onboarding-form" className="text-inherit no-underline hover:underline decoration-auto">
              Onboarding
            </Link>
          </li>
        </ul>
      </div>
    )
  },
  toc: {
    backToTop: true,
  },
  main: function Main({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const isBlogPost = router.pathname.startsWith("/blog/");

    const header = isBlogPost && <BlogPostHeader />;
    const footer = isBlogPost && <><BlogPostFooter /><div className="mt-16" /></>;

    return (
      <>
        {header}
        {children}
        {footer}
      </>
    );
  }
}

export default themeConfig
