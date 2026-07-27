import type { AlphabetLetter, Language } from "@/types/entities";

const now = new Date().toISOString();

/**
 * Base set of 46 Church Slavonic letters (Azbuka), including iotated and
 * "yus" variants. This is Stage-1 mock content for UI development only —
 * not a vetted liturgical reference. Numeric values are supplied only where
 * commonly attested; historic systems disagree on the rest.
 */
const LETTERS: { slug: string; glyph: string; name: string; numericValue?: number }[] = [
  { slug: "az", glyph: "А", name: "Азъ", numericValue: 1 },
  { slug: "buky", glyph: "Б", name: "Буки" },
  { slug: "vedi", glyph: "В", name: "Вѣди", numericValue: 2 },
  { slug: "glagol", glyph: "Г", name: "Глаголь", numericValue: 3 },
  { slug: "dobro", glyph: "Д", name: "Добро", numericValue: 4 },
  { slug: "est", glyph: "Є", name: "Есть", numericValue: 5 },
  { slug: "zhivete", glyph: "Ж", name: "Живѣте" },
  { slug: "dzelo", glyph: "Ѕ", name: "Ѕѣло", numericValue: 6 },
  { slug: "zemlya", glyph: "З", name: "Земля", numericValue: 7 },
  { slug: "izhe", glyph: "И", name: "Иже", numericValue: 8 },
  { slug: "i-desyaterichne", glyph: "І", name: "І (десятеричне)", numericValue: 10 },
  { slug: "kako", glyph: "К", name: "Како", numericValue: 20 },
  { slug: "lyudi", glyph: "Л", name: "Людіе", numericValue: 30 },
  { slug: "myslete", glyph: "М", name: "Мыслѣте", numericValue: 40 },
  { slug: "nash", glyph: "Н", name: "Нашь", numericValue: 50 },
  { slug: "on", glyph: "О", name: "Онъ", numericValue: 70 },
  { slug: "pokoy", glyph: "П", name: "Покой", numericValue: 80 },
  { slug: "rtsy", glyph: "Р", name: "Рцы", numericValue: 100 },
  { slug: "slovo", glyph: "С", name: "Слово", numericValue: 200 },
  { slug: "tverdo", glyph: "Т", name: "Твердо", numericValue: 300 },
  { slug: "uk", glyph: "Оу", name: "Укъ", numericValue: 400 },
  { slug: "fert", glyph: "Ф", name: "Фертъ", numericValue: 500 },
  { slug: "kher", glyph: "Х", name: "Хѣръ", numericValue: 600 },
  { slug: "ot", glyph: "Ѿ", name: "Отъ", numericValue: 800 },
  { slug: "tsi", glyph: "Ц", name: "Ци", numericValue: 900 },
  { slug: "cherv", glyph: "Ч", name: "Червь", numericValue: 90 },
  { slug: "sha", glyph: "Ш", name: "Ша" },
  { slug: "shta", glyph: "Щ", name: "Шта" },
  { slug: "er", glyph: "Ъ", name: "Еръ" },
  { slug: "ery", glyph: "Ы", name: "Еры" },
  { slug: "erj", glyph: "Ь", name: "Ерь" },
  { slug: "yat", glyph: "Ѣ", name: "Ять" },
  { slug: "yu", glyph: "Ю", name: "Ю" },
  { slug: "ya", glyph: "Ꙗ", name: "Я (йотоване)" },
  { slug: "ye", glyph: "Ѥ", name: "Є (йотоване)" },
  { slug: "yus-maliy", glyph: "Ѧ", name: "Юс малий", numericValue: 900 },
  { slug: "yus-maliy-yotovaniy", glyph: "Ѩ", name: "Юс малий йотований" },
  { slug: "yus-velykiy", glyph: "Ѫ", name: "Юс великий" },
  { slug: "yus-velykiy-yotovaniy", glyph: "Ѭ", name: "Юс великий йотований" },
  { slug: "ksi", glyph: "Ѯ", name: "Ксі", numericValue: 60 },
  { slug: "psi", glyph: "Ѱ", name: "Псі", numericValue: 700 },
  { slug: "fita", glyph: "Ѳ", name: "Фіта", numericValue: 9 },
  { slug: "izhitsa", glyph: "Ѵ", name: "Іжиця", numericValue: 400 },
  { slug: "ou-digraph", glyph: "Ѹ", name: "Оу (диграф)" },
  { slug: "omega", glyph: "Ѡ", name: "Ѡ (широке О)", numericValue: 800 },
  { slug: "u-shyroke", glyph: "Ꙋ", name: "Ѹ (У широке)" },
];

const LANGUAGE_LABEL: Record<Language, string> = { uk: "буква", ru: "буква", en: "letter" };
const LANGUAGE_HISTORY_NOTE: Record<Language, string> = {
  uk: "Вживалася в церковнослов'янських текстах; форма та значення уточнюються за богослужбовими джерелами.",
  ru: "Употреблялась в церковнославянских текстах; форма и значение уточняются по богослужебным источникам.",
  en: "Used in Church Slavonic texts; form and meaning are subject to confirmation against liturgical sources.",
};

function buildLetter(
  letter: (typeof LETTERS)[number],
  order: number,
  language: Language,
): AlphabetLetter {
  const isPartial = order === 12 && language === "en"; // demonstrates the "partial" fill state
  return {
    id: `letter-${letter.slug}-${language}`,
    translationGroupId: `letter-${letter.slug}`,
    language,
    slug: letter.slug,
    order,
    name: `${letter.glyph} — ${letter.name}`,
    pronunciation: isPartial ? undefined : `[${letter.name.toLowerCase()}]`,
    description: isPartial
      ? undefined
      : `Церковнослов'янська ${LANGUAGE_LABEL[language]} «${letter.name}».`,
    historicalNote: LANGUAGE_HISTORY_NOTE[language],
    numericValue: letter.numericValue,
    mainImageId: undefined,
    createdAt: now,
    updatedAt: now,
  };
}

export const mockAlphabetLetters: AlphabetLetter[] = LETTERS.flatMap((letter, index) =>
  (["uk", "ru", "en"] as Language[])
    .filter((language) => !(index === 45 && language === "en")) // last letter: demonstrates "empty" state for en
    .map((language) => buildLetter(letter, index, language)),
);
