import Link from "next/link";
import { Logo } from "@/components/logo";
import { siteConfig } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-white/10 pb-10 pt-14">
      <div className="container">
        <div className="flex flex-col gap-10 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl space-y-4">
            <Logo />
            <p className="text-sm leading-7 text-brand-muted">
              RapidCleanAI helps cleaning businesses move faster on quotes, protect margins, and launch a cleaner sales workflow.
            </p>
          </div>
          <div className="grid gap-3 text-sm text-brand-muted">
            <a href={`mailto:${siteConfig.footerSupportEmail}`} className="transition hover:text-white">
              {siteConfig.footerSupportEmail}
            </a>
            <p>{siteConfig.location}</p>
            <div className="flex flex-wrap gap-4">
              <Link href="/terms" className="transition hover:text-white">
                Terms
              </Link>
              <Link href="/privacy" className="transition hover:text-white">
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
