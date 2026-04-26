"use client";

import { useT } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/translations";

export function T({ k }: { k: TranslationKey }) {
  const t = useT();

  return <>{t(k)}</>;
}
