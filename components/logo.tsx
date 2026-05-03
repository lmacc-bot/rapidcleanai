import Image from "next/image";
import Link from "next/link";

type LogoProps = {
  href?: string;
  priority?: boolean;
};

export function Logo({ href = "/", priority = false }: LogoProps) {
  return (
    <Link href={href} className="flex items-center gap-3">
      <Image
        src="/logo.png"
        alt="RapidCleanAI"
        width={56}
        height={56}
        priority={priority}
        className="shrink-0 rounded-full object-contain"
      />

      <div className="flex flex-col leading-tight">
        <span className="font-semibold text-white">RapidCleanAI</span>
        <span className="text-xs text-brand-muted tracking-wide">
          QUOTE FASTER
        </span>
      </div>
    </Link>
  );
}
