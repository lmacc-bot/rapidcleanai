"use client";

import type { MockQuoteResponse } from "@/lib/mock-quote";
import { Copy, FilePlus2, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ResultsPanelProps = {
  result: MockQuoteResponse | null;
  loading: boolean;
  copied: boolean;
  errorMessage: string | null;
  onNewQuote: () => void;
  onCopy: () => void;
  onClear: () => void;
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function ResultsPanel({
  result,
  loading,
  copied,
  errorMessage,
  onNewQuote,
  onCopy,
  onClear,
}: ResultsPanelProps) {
  return (
    <Card className="surface-gradient premium-border h-full">
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Badge variant="secondary">Results Panel</Badge>
            <CardTitle className="mt-3 text-2xl">Quote output</CardTitle>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" type="button" onClick={onNewQuote}>
              <FilePlus2 className="size-4" />
              New Quote
            </Button>
            <Button variant="secondary" size="sm" type="button" onClick={onCopy} disabled={!result}>
              <Copy className="size-4" />
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button variant="secondary" size="sm" type="button" onClick={onClear}>
              <RotateCcw className="size-4" />
              Clear
            </Button>
          </div>
        </div>
        <CardDescription className="text-base leading-7">
          Review the mock structured result now, then swap this route to a real AI backend when you are ready.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {errorMessage ? (
          <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
            {errorMessage}
          </div>
        ) : null}

        {!result && !loading ? (
          <div className="flex min-h-[520px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/12 bg-[rgba(11,15,20,0.55)] px-6 text-center">
            <div className="mb-5 inline-flex size-14 items-center justify-center rounded-2xl border border-brand-neon/20 bg-brand-neon/10 text-brand-neon">
              <Sparkles className="size-6" />
            </div>
            <h3 className="font-display text-2xl font-semibold text-white">
              Your AI-generated quote will appear here.
            </h3>
            <p className="mt-3 max-w-md text-sm leading-7 text-brand-muted">
              Send a prompt from the left panel to populate the recommended price range, scope notes, customer-ready response, and next actions.
            </p>
          </div>
        ) : null}

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-3xl border border-white/10 bg-white/5"
              />
            ))}
          </div>
        ) : null}

        {result ? (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-3xl border border-brand-neon/20 bg-brand-neon/10 p-5 glow-ring">
                <p className="text-xs uppercase tracking-[0.18em] text-brand-neon">Recommended Estimate</p>
                <div className="mt-3 font-display text-5xl font-semibold text-white">
                  {money.format(result.recommendedEstimate.recommended)}
                </div>
                <p className="mt-3 text-sm text-brand-text/90">
                  Suggested range {money.format(result.recommendedEstimate.low)} -{" "}
                  {money.format(result.recommendedEstimate.high)}
                </p>
              </div>
              <div className="rounded-3xl border border-brand-cyan/20 bg-brand-cyan/10 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-brand-cyan">Margin Note</p>
                <p className="mt-3 text-sm leading-7 text-brand-text">{result.marginNote}</p>
                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-brand-muted">
                  <ShieldCheck className="size-3.5 text-brand-neon" />
                  Phase 1 protected dashboard
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <h4 className="font-display text-xl text-white">Summary</h4>
                <p className="mt-3 text-sm leading-7 text-brand-muted">{result.summary}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <h4 className="font-display text-xl text-white">Customer-ready message</h4>
                <p className="mt-3 text-sm leading-7 text-brand-muted">{result.customerMessage}</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <h4 className="font-display text-xl text-white">Scope highlights</h4>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-brand-muted">
                  {result.scopeHighlights.map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <h4 className="font-display text-xl text-white">Upsell suggestions</h4>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-brand-muted">
                  {result.upsellSuggestions.map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[rgba(11,15,20,0.62)] p-5">
              <h4 className="font-display text-xl text-white">Next actions</h4>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-brand-muted">
                {result.nextActions.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
