import { CheckCircle2 } from "lucide-react";
import { GlowButton } from "@/components/glow-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { BILLING_ENTRY_HREF } from "@/lib/stripe";

type PricingCardProps = {
  title: string;
  price: string;
  priceCaption: string;
  features: string[];
  className?: string;
  ctaLabel: string;
  badgeLabel: string;
  description: string;
  footerText: string;
};

export function PricingCard({
  title,
  price,
  priceCaption,
  features,
  className,
  ctaLabel,
  badgeLabel,
  description,
  footerText,
}: PricingCardProps) {
  return (
    <Card className={`surface-gradient premium-border card-sheen ${className ?? ""}`}>
      <CardHeader className="relative gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Badge>{badgeLabel}</Badge>
            <CardTitle className="mt-4 text-3xl text-white">{title}</CardTitle>
          </div>
          <div className="rounded-2xl border border-brand-neon/20 bg-brand-neon/10 px-4 py-3 text-right">
            <div className="font-display text-4xl font-semibold text-brand-neon">{price}</div>
            <div className="text-sm text-brand-muted">{priceCaption}</div>
          </div>
        </div>
        <p className="max-w-2xl text-brand-muted">
          {description}
        </p>
      </CardHeader>
      <CardContent className="relative">
        <ul className="grid gap-3 text-sm text-brand-text sm:grid-cols-2">
          {features.map((feature) => (
            <li key={feature} className="flex items-center gap-3 rounded-2xl border border-white/6 bg-white/4 px-4 py-3">
              <CheckCircle2 className="size-4 text-brand-neon" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-brand-muted">
          {footerText}
        </div>
        <GlowButton href={BILLING_ENTRY_HREF}>{ctaLabel}</GlowButton>
      </CardFooter>
    </Card>
  );
}
