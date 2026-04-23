"use client";

import type { FormEvent } from "react";
import { MessageSquareText, SendHorizontal, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { MAX_CHAT_PROMPT_CHARS } from "@/lib/validation";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ChatPanelProps = {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: (value: string) => Promise<void> | void;
  messages: ChatMessage[];
  samplePrompts: string[];
  loading: boolean;
};

export function ChatPanel({
  prompt,
  onPromptChange,
  onSubmit,
  messages,
  samplePrompts,
  loading,
}: ChatPanelProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSubmit(prompt);
  }

  return (
    <Card className="surface-gradient premium-border h-full">
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Badge>Chat Panel</Badge>
            <CardTitle className="mt-3 text-2xl">Describe the quote request</CardTitle>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-cyan/20 bg-brand-cyan/10 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-brand-cyan">
            <Sparkles className="size-3.5" />
            MVP Assistant
          </div>
        </div>
        <CardDescription className="text-base leading-7">
          Paste the job details, scope, frequency, special requests, and anything that affects pricing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-3xl border border-white/10 bg-[rgba(11,15,20,0.6)] p-4">
          <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-brand-muted">
            <MessageSquareText className="size-4" />
            Recent prompts
          </div>
          <div className="max-h-[280px] space-y-3 overflow-auto pr-2">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "rounded-2xl border px-4 py-3 text-sm leading-7",
                  message.role === "assistant"
                    ? "border-brand-cyan/20 bg-brand-cyan/10 text-brand-text"
                    : "border-brand-neon/20 bg-brand-neon/10 text-brand-text",
                )}
              >
                <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-brand-muted">
                  {message.role === "assistant" ? "RapidCleanAI" : "You"}
                </div>
                <p>{message.content}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.18em] text-brand-muted">Sample prompts</p>
          <div className="flex flex-wrap gap-2">
            {samplePrompts.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => onPromptChange(sample)}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-left text-sm text-brand-muted transition hover:border-brand-neon/30 hover:text-white"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <Textarea
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            placeholder="Example: Deep clean for a 3 bed / 2 bath home, 2,100 sq ft, pet hair, inside fridge requested, quote needed by tomorrow."
            className="min-h-[150px]"
            maxLength={MAX_CHAT_PROMPT_CHARS}
          />
          <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={loading || !prompt.trim()}>
            {loading ? "Generating..." : "Send"}
            <SendHorizontal className="size-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
