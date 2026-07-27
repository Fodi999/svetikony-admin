import type { GospelReading, Language } from "@/types/entities";

const now = new Date().toISOString();

interface GospelSeed {
  groupId: string;
  slug: string;
  reference: string;
  status: GospelReading["status"];
  titles: Record<Language, string>;
  texts: Record<Language, string>;
  explanations: Record<Language, string>;
  relatedCalendarDayIds?: string[];
}

const seeds: GospelSeed[] = [
  {
    groupId: "gospel-john-1",
    slug: "na-pochatku-bulo-slovo",
    reference: "Ів. 1:1-17",
    status: "published",
    titles: {
      uk: "На початку було Слово",
      ru: "В начале было Слово",
      en: "In the Beginning Was the Word",
    },
    texts: {
      uk: "На початку було Слово, і Слово було у Бога, і Слово було Бог...",
      ru: "В начале было Слово, и Слово было у Бога, и Слово было Бог...",
      en: "In the beginning was the Word, and the Word was with God, and the Word was God...",
    },
    explanations: {
      uk: "Пролог Євангелія від Івана розкриває богословське вчення про Логос.",
      ru: "Пролог Евангелия от Иоанна раскрывает богословское учение о Логосе.",
      en: "The prologue of John's Gospel reveals the theological teaching about the Logos.",
    },
    relatedCalendarDayIds: ["cal-nativity-uk"],
  },
  {
    groupId: "gospel-matthew-5",
    slug: "blazhenstva",
    reference: "Мт. 5:1-12",
    status: "published",
    titles: { uk: "Заповіді блаженства", ru: "Заповеди блаженства", en: "The Beatitudes" },
    texts: {
      uk: "Блаженні бідні духом, бо їхнє Царство Небесне...",
      ru: "Блаженны нищие духом, ибо их есть Царство Небесное...",
      en: "Blessed are the poor in spirit, for theirs is the kingdom of heaven...",
    },
    explanations: {
      uk: "Нагірна проповідь Христа з дев'ятьма заповідями блаженства.",
      ru: "Нагорная проповедь Христа с девятью заповедями блаженства.",
      en: "Christ's Sermon on the Mount, containing the nine Beatitudes.",
    },
  },
  {
    groupId: "gospel-luke-2",
    slug: "narodzhennya-isusa-hrysta",
    reference: "Лк. 2:1-20",
    status: "published",
    titles: {
      uk: "Народження Ісуса Христа",
      ru: "Рождение Иисуса Христа",
      en: "The Birth of Jesus Christ",
    },
    texts: {
      uk: "Того часу вийшов наказ від кесаря Августа зробити перепис усієї землі...",
      ru: "В те дни вышло от кесаря Августа повеление сделать перепись по всей земле...",
      en: "In those days a decree went out from Caesar Augustus that all the world should be registered...",
    },
    explanations: {
      uk: "Євангельська розповідь про народження Спасителя у Вифлеємі.",
      ru: "Евангельский рассказ о рождении Спасителя в Вифлееме.",
      en: "The Gospel account of the Savior's birth in Bethlehem.",
    },
    relatedCalendarDayIds: ["cal-nativity-uk"],
  },
  {
    groupId: "gospel-matthew-3",
    slug: "hreshchennya-isusa",
    reference: "Мт. 3:13-17",
    status: "draft",
    titles: { uk: "Хрещення Ісуса", ru: "Крещение Иисуса", en: "The Baptism of Jesus" },
    texts: {
      uk: "Тоді приходить Ісус із Галилеї на Йордан до Івана, щоб охриститись від нього...",
      ru: "Тогда приходит Иисус из Галилеи на Иордан к Иоанну креститься от него...",
      en: "Then Jesus came from Galilee to the Jordan to John, to be baptized by him...",
    },
    explanations: {
      uk: "Читання на свято Богоявлення.",
      ru: "Чтение на праздник Богоявления.",
      en: "The reading for the feast of Theophany.",
    },
    relatedCalendarDayIds: ["cal-theophany-uk"],
  },
  {
    groupId: "gospel-john-15",
    slug: "ya-lozа-a-vy-hilochky",
    reference: "Ів. 15:1-8",
    status: "published",
    titles: { uk: "Я — Лоза, а ви — гілки", ru: "Я — Лоза, а вы — ветви", en: "I Am the Vine" },
    texts: {
      uk: "Я — правдива Лоза, а Отець Мій — виноградар...",
      ru: "Я есмь истинная виноградная Лоза, а Отец Мой — виноградарь...",
      en: "I am the true vine, and my Father is the vinedresser...",
    },
    explanations: {
      uk: "Притча про єдність вірних зі Христом.",
      ru: "Притча о единстве верных со Христом.",
      en: "The parable of the faithful's unity with Christ.",
    },
  },
];

function buildReading(seed: GospelSeed, language: Language): GospelReading {
  return {
    id: `${seed.groupId}-${language}`,
    translationGroupId: seed.groupId,
    language,
    title: seed.titles[language],
    slug: seed.slug,
    reference: seed.reference,
    text: seed.texts[language],
    explanation: seed.explanations[language],
    status: seed.status,
    relatedCalendarDayIds: seed.relatedCalendarDayIds ?? [],
    createdAt: now,
    updatedAt: now,
  };
}

export const mockGospelReadings: GospelReading[] = seeds.flatMap((seed) =>
  (["uk", "ru", "en"] as Language[]).map((language) => buildReading(seed, language)),
);
