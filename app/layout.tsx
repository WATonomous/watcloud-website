// The prefixed stylesheet uses layer names that don't conflict with Tailwind v3's `@layer` directives.
import '@/styles/global.css'
import 'nextra-theme-docs/style-prefixed.css'

import type { Metadata } from 'next'
import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import { Head } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import { Logo } from '@/components/logo'
import { SiteFooter } from '@/components/site-footer'
import { websiteConfig } from '@/lib/data'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: {
    default: 'WATcloud',
    template: '%s – WATcloud',
  },
  appleWebApp: {
    title: 'WATcloud',
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const navbar = (
    <Navbar
      logo={<Logo />}
      chatLink={`https://discord.gg/${websiteConfig.discord_invite_code}`}
    />
  )

  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head>
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
      </Head>
      <body>
        <Providers />
        <Layout
          navbar={navbar}
          footer={<Footer><SiteFooter /></Footer>}
          pageMap={await getPageMap()}
          // Nextra joins this with the page's file path using a slash
          docsRepositoryBase={websiteConfig.docs_repository_base.replace(/\/$/, '')}
          feedback={{ labels: 'website' }}
          copyPageButton={false}
        >
          {children}
        </Layout>
      </body>
    </html>
  )
}
