import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type SharedProps = {
  children: ReactNode;
  className?: string;
  trailingIcon?: boolean;
  variant?: "primary" | "secondary";
};

type LinkProps = SharedProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
  };

type ActionProps = SharedProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

const baseStyles =
  "inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-all duration-200";

const variants = {
  primary:
    "bg-brand-neon text-brand-bg shadow-glow hover:-translate-y-0.5 hover:shadow-[0_20px_55px_rgba(34,255,136,0.28)]",
  secondary:
    "border border-white/12 bg-white/6 text-brand-text hover:border-brand-cyan/40 hover:bg-white/10",
};

function isLinkProps(props: LinkProps | ActionProps): props is LinkProps {
  return typeof props.href === "string";
}

export function GlowButton(props: LinkProps | ActionProps) {
  const content = (
    <>
      <span>{props.children}</span>
      {props.trailingIcon !== false ? <ArrowRight className="size-4" /> : null}
    </>
  );

  if (isLinkProps(props)) {
    const { href, className, variant = "primary", trailingIcon, ...rest } = props;
    const isExternal = href.startsWith("http");

    if (isExternal) {
      return (
        <a
          href={href}
          className={cn(baseStyles, variants[variant], className)}
          rel="noreferrer"
          {...rest}
        >
          {content}
        </a>
      );
    }

    return (
      <Link href={href} className={cn(baseStyles, variants[variant], className)} {...rest}>
        {content}
      </Link>
    );
  }

  const { className, variant = "primary", trailingIcon, type, ...rest } = props;
  const buttonType: ButtonHTMLAttributes<HTMLButtonElement>["type"] =
    type === "submit" || type === "reset" ? type : "button";

  return (
    <button type={buttonType} className={cn(baseStyles, variants[variant], className)} {...rest}>
      {content}
    </button>
  );
}
