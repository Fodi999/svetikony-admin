import type { Language, Saint } from "@/types/entities";

const now = new Date().toISOString();

interface SaintSeed {
  groupId: string;
  slug: string;
  feastDayNewStyle?: string;
  imageId: string;
  status: Saint["status"];
  names: Record<Language, string>;
  shortDescriptions: Record<Language, string>;
  biographies: Record<Language, string>;
}

const seeds: SaintSeed[] = [
  {
    groupId: "saint-mykolai",
    slug: "svyatytel-mykolai-chudotvorets",
    feastDayNewStyle: "12-19",
    imageId: "media-saint-mykolai",
    status: "published",
    names: {
      uk: "Святитель Микола Чудотворець",
      ru: "Святитель Николай Чудотворец",
      en: "St. Nicholas the Wonderworker",
    },
    shortDescriptions: {
      uk: "Архієпископ Мир Лікійських, покровитель моряків, дітей і подорожніх.",
      ru: "Архиепископ Мир Ликийских, покровитель моряков, детей и путешествующих.",
      en: "Archbishop of Myra in Lycia, patron of sailors, children, and travelers.",
    },
    biographies: {
      uk: "Народився у місті Патари в Лікії у благочестивій родині. З юних літ присвятив себе служінню Церкві...",
      ru: "Родился в городе Патары в Ликии в благочестивой семье. С юных лет посвятил себя служению Церкви...",
      en: "Born in the city of Patara in Lycia to a devout family, he dedicated himself to church service from a young age...",
    },
  },
  {
    groupId: "saint-olha",
    slug: "svyata-rivnoapostolna-knyahynya-olha",
    feastDayNewStyle: "07-24",
    imageId: "media-saint-olha",
    status: "published",
    names: {
      uk: "Свята рівноапостольна княгиня Ольга",
      ru: "Святая равноапостольная княгиня Ольга",
      en: "St. Olga, Equal to the Apostles",
    },
    shortDescriptions: {
      uk: "Київська княгиня, перша правителька Русі, що прийняла християнство.",
      ru: "Киевская княгиня, первая правительница Руси, принявшая христианство.",
      en: "Princess of Kyiv, the first ruler of Rus' to accept Christianity.",
    },
    biographies: {
      uk: "Після смерті князя Ігоря правила Київською Руссю, охрестилася в Константинополі...",
      ru: "После смерти князя Игоря правила Киевской Русью, крестилась в Константинополе...",
      en: "After the death of Prince Igor, she ruled Kyivan Rus' and was baptized in Constantinople...",
    },
  },
  {
    groupId: "saint-volodymyr",
    slug: "svyatyi-rivnoapostolnyi-knyaz-volodymyr",
    feastDayNewStyle: "07-28",
    imageId: "media-saint-mykolai",
    status: "published",
    names: {
      uk: "Святий рівноапостольний князь Володимир",
      ru: "Святой равноапостольный князь Владимир",
      en: "St. Volodymyr, Equal to the Apostles",
    },
    shortDescriptions: {
      uk: "Хреститель Київської Русі, покровитель Української Церкви.",
      ru: "Креститель Киевской Руси, покровитель Украинской Церкви.",
      en: "The baptizer of Kyivan Rus', patron of the Ukrainian Church.",
    },
    biographies: {
      uk: "Онук святої Ольги, охрестив Русь у 988 році в водах Дніпра...",
      ru: "Внук святой Ольги, крестил Русь в 988 году в водах Днепра...",
      en: "Grandson of St. Olga, he baptized Rus' in 988 in the waters of the Dnipro...",
    },
  },
  {
    groupId: "saint-varvara",
    slug: "svyata-velykomuchenytsya-varvara",
    feastDayNewStyle: "12-17",
    imageId: "media-saint-olha",
    status: "draft",
    names: {
      uk: "Свята великомучениця Варвара",
      ru: "Святая великомученица Варвара",
      en: "St. Barbara the Great Martyr",
    },
    shortDescriptions: {
      uk: "Покровителька гірників та тих, хто просить про захист від наглої смерті.",
      ru: "Покровительница шахтёров и тех, кто просит защиты от внезапной смерти.",
      en: "Patroness of miners and those who pray for protection from sudden death.",
    },
    biographies: {
      uk: "Постраждала за віру Христову за царювання Максиміана...",
      ru: "Пострадала за веру Христову во времена правления Максимиана...",
      en: "She suffered for the Christian faith during the reign of Maximian...",
    },
  },
  {
    groupId: "saint-panteleimon",
    slug: "svyatyi-velykomuchenyk-panteleymon",
    feastDayNewStyle: "08-09",
    imageId: "media-saint-mykolai",
    status: "published",
    names: {
      uk: "Святий великомученик і цілитель Пантелеймон",
      ru: "Святой великомученик и целитель Пантелеимон",
      en: "St. Panteleimon the Healer",
    },
    shortDescriptions: {
      uk: "Лікар і цілитель, покровитель хворих і медиків.",
      ru: "Врач и целитель, покровитель больных и медиков.",
      en: "A physician and healer, patron of the sick and of medical workers.",
    },
    biographies: {
      uk: "Навчався лікарській справі, зцілював людей іменем Христовим без плати...",
      ru: "Обучался врачебному делу, исцелял людей именем Христовым безвозмездно...",
      en: "Trained as a physician, he healed people in Christ's name without payment...",
    },
  },
];

function buildSaint(seed: SaintSeed, language: Language): Saint {
  return {
    id: `${seed.groupId}-${language}`,
    translationGroupId: seed.groupId,
    language,
    name: seed.names[language],
    slug: seed.slug,
    shortDescription: seed.shortDescriptions[language],
    biography: seed.biographies[language],
    feastDayNewStyle: seed.feastDayNewStyle,
    imageId: seed.imageId,
    status: seed.status,
    relatedIconIds: [],
    relatedCalendarDayIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

export const mockSaints: Saint[] = seeds.flatMap((seed) =>
  (["uk", "ru", "en"] as Language[]).map((language) => buildSaint(seed, language)),
);
