"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  MAX_CONTACT_MESSAGE_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_NAME_LENGTH,
  validateContactInput,
} from "@/lib/validation";

const supportEmail = "support@rapidclean.ai";

export function ContactForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validation = validateContactInput(form);
    if (!validation.success) {
      setSubmitted(false);
      setError(validation.message);
      return;
    }

    const subject = encodeURIComponent(`RapidCleanAI inquiry from ${validation.data.name}`);
    const body = encodeURIComponent(
      [
        `Name: ${validation.data.name}`,
        `Email: ${validation.data.email}`,
        ``,
        validation.data.message,
      ].join("\n"),
    );

    setError(null);
    setSubmitted(true);
    window.location.href = `mailto:${supportEmail}?subject=${subject}&body=${body}`;
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="Your name"
            autoComplete="name"
            maxLength={MAX_NAME_LENGTH}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
            maxLength={MAX_EMAIL_LENGTH}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          value={form.message}
          onChange={(event) => updateField("message", event.target.value)}
          placeholder="Tell us what you need help with."
          maxLength={MAX_CONTACT_MESSAGE_LENGTH}
          required
        />
      </div>
      {error ? (
        <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" size="lg">
          <Mail className="size-4" />
          Send message
        </Button>
        <p className="text-sm text-brand-muted">
          This opens your email app with the message prefilled for direct delivery.
        </p>
      </div>
      {submitted ? (
        <p className="text-sm text-brand-neon">
          If your email app did not open, send your note directly to {supportEmail}.
        </p>
      ) : null}
    </form>
  );
}
