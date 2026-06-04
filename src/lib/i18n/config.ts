export const locales = ["en", "km"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  km: "ភាសាខ្មែរ",
};
export const localeFlags: Record<Locale, string> = {
  en: "/flags/us.svg",
  km: "/flags/kh.svg",
};