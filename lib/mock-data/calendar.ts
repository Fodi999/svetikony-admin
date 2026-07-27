import type { CalendarDay, Language } from "@/types/entities";

const now = new Date().toISOString();

interface CalendarSeed {
  groupId: string;
  date: string;
  slug: string;
  eventType: CalendarDay["eventType"];
  titles: Record<Language, string>;
  descriptions: Record<Language, string>;
  relatedIconIds?: string[];
  relatedSaintIds?: string[];
  relatedGospelIds?: string[];
  relatedPrayerIds?: string[];
}

const seeds: CalendarSeed[] = [
  {
    groupId: "cal-nativity",
    date: "2026-01-07",
    slug: "rizdvo-hrystove",
    eventType: "feast",
    titles: {
      uk: "Різдво Христове",
      ru: "Рождество Христово",
      en: "Nativity of Christ",
    },
    descriptions: {
      uk: "Одне з дванадесятих свят — народження Господа Ісуса Христа у Вифлеємі.",
      ru: "Один из двунадесятых праздников — рождение Господа Иисуса Христа в Вифлееме.",
      en: "One of the twelve great feasts — the birth of our Lord Jesus Christ in Bethlehem.",
    },
    relatedIconIds: ["icon-spasitel"],
  },
  {
    groupId: "cal-theophany",
    date: "2026-01-19",
    slug: "bohoyavlennya",
    eventType: "feast",
    titles: {
      uk: "Богоявлення (Хрещення Господнє)",
      ru: "Богоявление (Крещение Господне)",
      en: "Theophany (Baptism of the Lord)",
    },
    descriptions: {
      uk: "Свято хрещення Ісуса Христа в водах Йордану та освячення води.",
      ru: "Праздник крещения Иисуса Христа в водах Иордана и освящения воды.",
      en: "The feast of the baptism of Jesus Christ in the Jordan and the blessing of water.",
    },
  },
  {
    groupId: "cal-sretenie",
    date: "2026-02-15",
    slug: "stritennya-hospodnie",
    eventType: "feast",
    titles: {
      uk: "Стрітення Господнє",
      ru: "Сретение Господне",
      en: "Presentation of the Lord",
    },
    descriptions: {
      uk: "Зустріч немовляти Христа зі старцем Симеоном у Єрусалимському храмі.",
      ru: "Встреча младенца Христа со старцем Симеоном в Иерусалимском храме.",
      en: "The meeting of the infant Christ with the elder Simeon in the Jerusalem temple.",
    },
  },
  {
    groupId: "cal-annunciation",
    date: "2026-04-07",
    slug: "blahovishchennya",
    eventType: "feast",
    titles: {
      uk: "Благовіщення Пресвятої Богородиці",
      ru: "Благовещение Пресвятой Богородицы",
      en: "Annunciation of the Most Holy Theotokos",
    },
    descriptions: {
      uk: "Архангел Гавриїл сповіщає Діві Марії благу вість про народження Спасителя.",
      ru: "Архангел Гавриил возвещает Деве Марии благую весть о рождении Спасителя.",
      en: "The Archangel Gabriel announces to the Virgin Mary the good news of the Savior's birth.",
    },
    relatedIconIds: ["icon-bogomater"],
  },
  {
    groupId: "cal-transfiguration",
    date: "2026-08-19",
    slug: "preobrazhennya-hospodnie",
    eventType: "feast",
    titles: {
      uk: "Преображення Господнє",
      ru: "Преображение Господне",
      en: "Transfiguration of the Lord",
    },
    descriptions: {
      uk: "Явлення Божественної слави Христа на горі Фавор перед трьома апостолами.",
      ru: "Явление Божественной славы Христа на горе Фавор перед тремя апостолами.",
      en: "The manifestation of Christ's divine glory on Mount Tabor before three apostles.",
    },
  },
  {
    groupId: "cal-pokrova",
    date: "2026-10-14",
    slug: "pokrova-presvyatoi-bohorodytsi",
    eventType: "feast",
    titles: {
      uk: "Покрова Пресвятої Богородиці",
      ru: "Покров Пресвятой Богородицы",
      en: "Protection of the Most Holy Theotokos",
    },
    descriptions: {
      uk: "Свято на честь заступництва Богородиці, явленого у Влахернському храмі.",
      ru: "Праздник в честь заступничества Богородицы, явленного во Влахернском храме.",
      en: "A feast honoring the Theotokos's protection, revealed at the Blachernae church.",
    },
    relatedIconIds: ["icon-pokrova"],
  },
];

function buildDay(seed: CalendarSeed, language: Language, index: number): CalendarDay {
  return {
    id: `${seed.groupId}-${language}`,
    translationGroupId: seed.groupId,
    language,
    date: seed.date,
    title: seed.titles[language],
    slug: seed.slug,
    shortDescription: seed.descriptions[language],
    history: undefined,
    eventType: seed.eventType,
    status: index % 5 === 0 ? "draft" : "published",
    imageId: seed.relatedIconIds ? "media-church-exterior" : undefined,
    relatedIconIds: seed.relatedIconIds ?? [],
    relatedPrayerIds: seed.relatedPrayerIds ?? [],
    relatedSaintIds: seed.relatedSaintIds ?? [],
    relatedGospelIds: seed.relatedGospelIds ?? [],
    createdAt: now,
    updatedAt: now,
  };
}

export const mockCalendarDays: CalendarDay[] = seeds.flatMap((seed, i) =>
  (["uk", "ru", "en"] as Language[]).map((language) => buildDay(seed, language, i)),
);
