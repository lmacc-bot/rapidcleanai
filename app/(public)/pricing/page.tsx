import type { Metadata } from "next";
import { PricingPageContent } from "@/components/pricing-page-content";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Choose Starter, Pro, or Elite with a 14-day full-access trial.",
};

export default function PricingPage() {
  return <PricingPageContent />;
}
