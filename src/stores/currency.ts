"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * Currency preference store.
 *
 * Twogether was originally rupiah-only ("Rp 12.345"). To support partners
 * outside Indonesia, this store carries the active currency code + locale
 * and `formatRupiah` (in lib/utils) reads from it on every call.
 *
 * The name `formatRupiah` is preserved (touches 21 files to rename); think
 * of the rupiah label as "shorthand for the user's currency".
 */

export interface CurrencyOption {
  code: string;
  /** Symbol shown in short-form ("Rp 1.2jt", "$1.2K"). */
  symbol: string;
  /** BCP 47 locale used by Intl.NumberFormat. */
  locale: string;
  /** Localised label for the picker UI ("Rupiah Indonesia"). */
  label: string;
}

export const CURRENCIES: CurrencyOption[] = [
  { code: "IDR", symbol: "Rp", locale: "id-ID", label: "Rupiah Indonesia" },
  { code: "USD", symbol: "$", locale: "en-US", label: "US Dollar" },
  { code: "EUR", symbol: "€", locale: "de-DE", label: "Euro" },
  { code: "GBP", symbol: "£", locale: "en-GB", label: "British Pound" },
  { code: "SGD", symbol: "S$", locale: "en-SG", label: "Singapore Dollar" },
  { code: "MYR", symbol: "RM", locale: "ms-MY", label: "Malaysian Ringgit" },
  { code: "JPY", symbol: "¥", locale: "ja-JP", label: "Japanese Yen" },
  { code: "AUD", symbol: "A$", locale: "en-AU", label: "Australian Dollar" },
  { code: "CAD", symbol: "C$", locale: "en-CA", label: "Canadian Dollar" },
  { code: "AED", symbol: "د.إ", locale: "ar-AE", label: "UAE Dirham" },
  { code: "THB", symbol: "฿", locale: "th-TH", label: "Thai Baht" },
  { code: "KRW", symbol: "₩", locale: "ko-KR", label: "Korean Won" },
];

interface CurrencyState {
  code: string;
  setCurrency: (code: string) => void;
}

export const useCurrency = create<CurrencyState>()(
  persist(
    (set) => ({
      code: "IDR",
      setCurrency: (code) => {
        if (CURRENCIES.find((c) => c.code === code)) set({ code });
      },
    }),
    {
      name: "bareng:currency",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/** Lookup the active currency option, falling back to IDR. */
export function getActiveCurrency(): CurrencyOption {
  const code = useCurrency.getState().code;
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}
