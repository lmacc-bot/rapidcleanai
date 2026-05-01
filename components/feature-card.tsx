import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type FeatureCardProps = {
  icon: ReactNode;
  title: ReactNode;
  description: ReactNode;
  className?: string;
};

export function FeatureCard({ icon, title, description, className }: FeatureCardProps) {
  return (
    <Card className={cn("surface-gradient premium-border h-full", className)}>
      <CardHeader>
        <div className="inline-flex size-12 items-center justify-center rounded-2xl border border-brand-cyan/20 bg-brand-cyan/10 text-brand-cyan">
          {icon}
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-7 text-brand-muted">{description}</p>
      </CardContent>
    </Card>
  );
}
