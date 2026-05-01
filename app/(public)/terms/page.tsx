import type { Metadata } from "next";
import { SectionHeading } from "@/components/section-heading";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Terms",
  description: "RapidCleanAI terms of service.",
};

export default function TermsPage() {
  return (
    <div className="container pb-20 pt-12">
      <SectionHeading
        eyebrow="Terms"
        title="Terms of Service"
        description="Clear terms for using RapidCleanAI's AI-powered quote assistant."
      />
      <Card className="surface-gradient premium-border mt-8">
        <CardContent className="space-y-6 p-8 text-sm leading-8 text-brand-muted">
          <p>
            By using RapidCleanAI, you agree to use the service for lawful business purposes and to keep your account credentials secure. You are responsible for activity that occurs under your account.
          </p>
          <p>
            The service is provided on a subscription basis and may change over time as features are improved. Hosted billing and subscription checkout are processed through Stripe.
          </p>
          <p>
            RapidCleanAI provides quote guidance to support your workflow, but you remain responsible for final pricing decisions, customer communication, and business outcomes.
          </p>
          <p>
            Questions about these terms can be sent to support@rapidclean.ai.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
