import type { Metadata } from "next";
import { SectionHeading } from "@/components/section-heading";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Privacy",
  description: "RapidCleanAI privacy policy.",
};

export default function PrivacyPage() {
  return (
    <div className="container pb-20 pt-12">
      <SectionHeading
        eyebrow="Privacy"
        title="Privacy Policy"
        description="A simple Phase 1 policy you can refine with legal counsel before launch."
      />
      <Card className="surface-gradient premium-border mt-8">
        <CardContent className="space-y-6 p-8 text-sm leading-8 text-brand-muted">
          <p>
            RapidCleanAI collects the information you submit to create an account, log in, and use the dashboard. This may include your name, email address, and quote prompt content.
          </p>
          <p>
            We use this information to operate the service, secure accounts, improve the product, and provide customer support. Payment processing is handled by Stripe through hosted checkout.
          </p>
          <p>
            We do not sell your personal information. We may share limited information with service providers such as hosting, authentication, analytics, and payment platforms when needed to run the service.
          </p>
          <p>
            You can contact us to request access, correction, or deletion of your account information. Before launch, have legal counsel review this policy to match your exact business practices and jurisdiction requirements.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
