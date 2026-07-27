import type { Article, Language } from "@/types/entities";

const now = new Date().toISOString();

interface ArticleSeed {
  groupId: string;
  slug: string;
  status: Article["status"];
  coverImageId?: string;
  titles: Record<Language, string>;
  contents: Record<Language, string>;
  seoTitles?: Partial<Record<Language, string>>;
  seoDescriptions?: Partial<Record<Language, string>>;
}

const seeds: ArticleSeed[] = [
  {
    groupId: "article-icon-history",
    slug: "istoriya-ikonopysu",
    status: "published",
    coverImageId: "media-icon-troitsa",
    titles: {
      uk: "Історія іконопису: від Візантії до наших днів",
      ru: "История иконописи: от Византии до наших дней",
      en: "The History of Icon Painting: From Byzantium to Today",
    },
    contents: {
      uk: "Іконопис як мистецтво зародився у Візантії та пройшов складний шлях розвитку...",
      ru: "Иконопись как искусство зародилась в Византии и прошла сложный путь развития...",
      en: "Icon painting as an art form emerged in Byzantium and went through a complex evolution...",
    },
    seoTitles: { uk: "Історія іконопису | Світ Ікони" },
    seoDescriptions: { uk: "Коротка історія іконопису від витоків до сьогодення." },
  },
  {
    groupId: "article-how-to-pray",
    slug: "yak-molytysya-vdoma",
    status: "published",
    titles: {
      uk: "Як молитися вдома: поради для родини",
      ru: "Как молиться дома: советы для семьи",
      en: "How to Pray at Home: Tips for Families",
    },
    contents: {
      uk: "Домашня молитва — важлива частина духовного життя кожної родини...",
      ru: "Домашняя молитва — важная часть духовной жизни каждой семьи...",
      en: "Home prayer is an important part of every family's spiritual life...",
    },
  },
  {
    groupId: "article-fasting",
    slug: "sens-postu",
    status: "draft",
    titles: { uk: "Сенс посту у житті християнина", ru: "Смысл поста в жизни христианина", en: "The Meaning of Fasting" },
    contents: {
      uk: "Піст — це не лише обмеження в їжі, а насамперед духовна практика...",
      ru: "Пост — это не только ограничение в еде, но прежде всего духовная практика...",
      en: "Fasting is not merely a dietary restriction but, above all, a spiritual practice...",
    },
  },
  {
    groupId: "article-church-slavonic",
    slug: "chomu-varto-znaty-tserkovnoslovyansku",
    status: "published",
    coverImageId: "media-church-interior",
    titles: {
      uk: "Чому варто знати церковнослов'янську мову",
      ru: "Почему стоит знать церковнославянский язык",
      en: "Why It's Worth Knowing Church Slavonic",
    },
    contents: {
      uk: "Церковнослов'янська мова — мова богослужіння, що зберігає глибину традиції...",
      ru: "Церковнославянский язык — язык богослужения, сохраняющий глубину традиции...",
      en: "Church Slavonic is the language of worship, preserving the depth of tradition...",
    },
  },
  {
    groupId: "article-icon-care",
    slug: "yak-dohlyadaty-za-ikonoyu",
    status: "archived",
    titles: {
      uk: "Як доглядати за домашньою іконою",
      ru: "Как ухаживать за домашней иконой",
      en: "How to Care for a Home Icon",
    },
    contents: {
      uk: "Правильний догляд допоможе зберегти ікону на довгі роки...",
      ru: "Правильный уход поможет сохранить икону на долгие годы...",
      en: "Proper care will help preserve an icon for many years...",
    },
  },
];

function buildArticle(seed: ArticleSeed, language: Language): Article {
  return {
    id: `${seed.groupId}-${language}`,
    translationGroupId: seed.groupId,
    language,
    title: seed.titles[language],
    slug: seed.slug,
    content: seed.contents[language],
    seoTitle: seed.seoTitles?.[language],
    seoDescription: seed.seoDescriptions?.[language],
    status: seed.status,
    coverImageId: seed.coverImageId,
    relatedIconIds: [],
    relatedSaintIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

export const mockArticles: Article[] = seeds.flatMap((seed) =>
  (["uk", "ru", "en"] as Language[]).map((language) => buildArticle(seed, language)),
);
