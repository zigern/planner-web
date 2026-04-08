"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

const LANG_OPTIONS = [
  { value: "pt-PT", label: "PT" },
  { value: "en-US", label: "EN" },
  { value: "es-ES", label: "ES" },
  { value: "fr-FR", label: "FR" }
];

const CURRENCY_OPTIONS = [
  { value: "EUR", label: "EUR" },
  { value: "USD", label: "USD" },
  { value: "GBP", label: "GBP" },
  { value: "BRL", label: "BRL" }
];

export function ViewControls({
  lang,
  currency
}: {
  lang: string;
  currency: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(search.toString());
    params.set(key, value);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="view-controls">
      <select value={lang} onChange={(e) => updateParam("lang", e.target.value)} aria-label="Language">
        {LANG_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <select value={currency} onChange={(e) => updateParam("currency", e.target.value)} aria-label="Currency">
        {CURRENCY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

