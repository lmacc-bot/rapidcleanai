import Link from "next/link";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type LogoProps = {
  href?: string;
  className?: string;
};

export function Logo({ href = "/", className }: LogoProps) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-3", className)}>
      <span className="inline-flex size-11 items-center justify-center rounded-2xl border border-brand-neon/20 bg-[linear-gradient(135deg,rgba(34,255,136,0.22),rgba(34,211,238,0.18))] shadow-glow">
        <Sparkles className="size-5 text-brand-neon" />
      </span>
      <span className="flex flex-col">
        <span className="font-display text-lg font-semibold tracking-tight text-white">
          RapidCleanAI
        </span>
        <span className="text-xs uppercase tracking-[0.28em] text-brand-muted">
          Quote Faster
        </span>
      </span>
    </Link>
  );
}
