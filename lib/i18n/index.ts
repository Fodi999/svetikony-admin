import { uk, type Messages } from "./messages";

/** Interface-chrome locales. Content translations (uk/ru/en per record) are unrelated — see types/entities.ts Language. */
export type InterfaceLocale = "uk";

const dictionaries: Record<InterfaceLocale, Messages> = { uk };

export function getMessages(locale: InterfaceLocale = "uk"): Messages {
  return dictionaries[locale];
}

/** Stage 1 ships the Ukrainian interface only; the dictionary shape already supports adding more. */
export const messages = getMessages("uk");
