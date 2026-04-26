"use client";

import { useT } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/translations";

export function T({ k }: { k: TranslationKey }) {
  const t = useT();

  return <>{t(k)}</>;
}

export function TFormat({
  k,
  values,
}: {
  k: TranslationKey;
  values: Record<string, string | number>;
}) {
  const t = useT();
  const text = Object.entries(values).reduce(
    (current, [key, value]) => current.replace(`{${key}}`, String(value)),
    t(k),
  );

  return <>{text}</>;
}
