import { Bot, Heart, Code2 } from "lucide-react"
import { Link } from "nextra-theme-docs"

export function SiteFooter() {
  return (
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
}
