import type { Metadata } from "next";
import { Mail, MapPin } from "lucide-react";
import { ContactForm } from "@/components/contact-form";
import { GlowButton } from "@/components/glow-button";
import { SectionHeading } from "@/components/section-heading";
import { Card, CardContent } from "@/components/ui/card";
import { siteConfig } from "@/lib/site";
import { STRIPE_LINK } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact RapidCleanAI support.",
};

export default function ContactPage() {
  return (
    <div className="container pb-20 pt-12">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
        <Card className="surface-gradient premium-border">
          <CardContent className="p-7">
            <SectionHeading
              eyebrow="Contact"
              title="Let’s get your quoting workflow launched."
              description="Use the form below to open a prefilled email, or contact support directly."
            />
            <div className="mt-8">
              <ContactForm />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="surface-gradient premium-border">
            <CardContent className="space-y-5 p-6">
              <div className="flex items-center gap-3 text-white">
                <Mail className="size-5 text-brand-neon" />
                <span>{siteConfig.pageSupportEmail}</span>
              </div>
              <div className="flex items-center gap-3 text-white">
                <MapPin className="size-5 text-brand-cyan" />
                <span>{siteConfig.location}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="surface-gradient premium-border">
            <CardContent className="space-y-4 p-6">
              <p className="text-xs uppercase tracking-[0.18em] text-brand-neon">Need to move quickly?</p>
              <h2 className="font-display text-3xl text-white">Start the Pro Plan now.</h2>
              <p className="text-sm leading-7 text-brand-muted">
                Checkout is already wired through Stripe, so you can start collecting subscription revenue immediately.
              </p>
              <GlowButton href={STRIPE_LINK}>Start Now</GlowButton>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
