import type { Icon, Language } from "@/types/entities";

const now = new Date().toISOString();

interface IconSeed {
  groupId: string;
  slug: string;
  mainImageId: string;
  titles: Record<Language, string>;
  descriptions: Record<Language, string>;
  status: Icon["status"];
  relatedCalendarDayIds?: string[];
  /** Languages intentionally missing a record — demonstrates the "empty" translation state. */
  skipLanguages?: Language[];
  /** Languages with a record but missing the description — demonstrates the "partial" translation state. */
  partialLanguages?: Language[];
}

const seeds: IconSeed[] = [
  {
    groupId: "icon-spasitel",
    slug: "spas-nerukotvorny",
    mainImageId: "media-icon-spasitel",
    titles: { uk: "Спас Нерукотворний", ru: "Спас Нерукотворный", en: "Christ Not Made by Hands" },
    descriptions: {
      uk: "Один із найдавніших образів Христа, за переказом — відбиток Його лику на плащаниці.",
      ru: "Один из древнейших образов Христа, по преданию — отпечаток Его лика на плащанице.",
      en: "One of the oldest images of Christ, said by tradition to be the imprint of His face.",
    },
    status: "published",
    relatedCalendarDayIds: ["cal-nativity-uk"],
  },
  {
    groupId: "icon-bogomater",
    slug: "bogomater-volodymyrska",
    mainImageId: "media-icon-bogomater",
    titles: {
      uk: "Богоматір Володимирська",
      ru: "Богоматерь Владимирская",
      en: "Theotokos of Vladimir",
    },
    descriptions: {
      uk: "Одна з найшанованіших ікон Богородиці типу «Одигітрія».",
      ru: "Одна из самых почитаемых икон Богородицы типа «Одигитрия».",
      en: "One of the most venerated icons of the Theotokos of the Hodegetria type.",
    },
    status: "published",
    relatedCalendarDayIds: ["cal-annunciation-uk"],
  },
  {
    groupId: "icon-mykolai",
    slug: "mykolai-chudotvorets",
    mainImageId: "media-icon-mykolai",
    titles: { uk: "Микола Чудотворець", ru: "Николай Чудотворец", en: "Nicholas the Wonderworker" },
    descriptions: {
      uk: "Образ святителя Миколая Мирлікійського, покровителя моряків та подорожніх.",
      ru: "Образ святителя Николая Мирликийского, покровителя моряков и путешествующих.",
      en: "The image of St. Nicholas of Myra, patron of sailors and travelers.",
    },
    status: "published",
  },
  {
    groupId: "icon-pokrova",
    slug: "pokrova-presvyatoi-bohorodytsi",
    mainImageId: "media-icon-pokrova",
    titles: {
      uk: "Покрова Пресвятої Богородиці",
      ru: "Покров Пресвятой Богородицы",
      en: "Protection of the Theotokos",
    },
    descriptions: {
      uk: "Ікона, що зображує заступництво Богородиці над людьми, явлене у Влахернському храмі.",
      ru: "Икона, изображающая заступничество Богородицы над людьми, явленное во Влахернском храме.",
      en: "An icon depicting the Theotokos's protection over people, revealed at Blachernae.",
    },
    status: "published",
    relatedCalendarDayIds: ["cal-pokrova-uk"],
  },
  {
    groupId: "icon-troitsa",
    slug: "svyata-troitsa",
    mainImageId: "media-icon-troitsa",
    titles: { uk: "Свята Трійця", ru: "Святая Троица", en: "The Holy Trinity" },
    descriptions: {
      uk: "Класичний образ письма Андрія Рубльова — три ангели за трапезою Авраама.",
      ru: "Классический образ письма Андрея Рублёва — три ангела за трапезой Авраама.",
      en: "The classic icon by Andrei Rublev — three angels at the table of Abraham.",
    },
    status: "draft",
    skipLanguages: ["en"],
  },
  {
    groupId: "icon-arhystratyh",
    slug: "arhystratyh-myhail",
    mainImageId: "media-icon-arhystratyh",
    titles: { uk: "Архістратиг Михаїл", ru: "Архистратиг Михаил", en: "Archangel Michael" },
    descriptions: {
      uk: "Образ предводителя небесного воїнства, захисника від темних сил.",
      ru: "Образ предводителя небесного воинства, защитника от тёмных сил.",
      en: "The image of the leader of the heavenly host, protector against dark forces.",
    },
    status: "archived",
    partialLanguages: ["ru"],
  },
];

function buildIcon(seed: IconSeed, language: Language): Icon {
  const isPartial = seed.partialLanguages?.includes(language);
  return {
    id: `${seed.groupId}-${language}`,
    translationGroupId: seed.groupId,
    language,
    slug: seed.slug,
    title: seed.titles[language],
    description: isPartial ? "" : seed.descriptions[language],
    history: undefined,
    saintImageDescription: undefined,
    materials: "Дерево, левкас, темпера",
    dimensions: "30 × 40 см",
    mainImageId: seed.mainImageId,
    galleryImageIds: [seed.mainImageId],
    relatedPrayerIds: [],
    relatedArticleIds: [],
    relatedCalendarDayIds: seed.relatedCalendarDayIds ?? [],
    status: seed.status,
    createdAt: now,
    updatedAt: now,
  };
}

export const mockIcons: Icon[] = seeds.flatMap((seed) =>
  (["uk", "ru", "en"] as Language[])
    .filter((language) => !seed.skipLanguages?.includes(language))
    .map((language) => buildIcon(seed, language)),
);
