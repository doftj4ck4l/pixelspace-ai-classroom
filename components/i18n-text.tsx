"use client";

import { useT, type TranslationKey } from "@/lib/i18n";

/** Translated text for server components: <T k="duties.empty" />. */
export const T = ({
  k,
  params,
}: {
  k: TranslationKey;
  params?: Record<string, string | number>;
}) => {
  const t = useT();
  return <>{t(k, params)}</>;
};
