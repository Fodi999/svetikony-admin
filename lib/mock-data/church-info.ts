import type { ChurchInfo } from "@/types/entities";

const now = new Date().toISOString();

export const mockChurchInfo: ChurchInfo = {
  address: "вул. Хрещатик, 1, Київ, Україна, 01001",
  phone: "+380 44 123 45 67",
  email: "info@svetikony.com",
  logoImageId: "media-church-logo",
  coverImageIds: ["media-church-exterior", "media-church-interior"],
  schedule: [
    { id: "sch-1", dayLabel: "Субота", serviceName: "Вечірня", time: "17:00" },
    { id: "sch-2", dayLabel: "Неділя", serviceName: "Божественна літургія", time: "09:00" },
    { id: "sch-3", dayLabel: "Щодня", serviceName: "Утреня", time: "08:00" },
  ],
  socialLinks: [
    { id: "soc-1", platform: "Facebook", url: "https://facebook.com/svetikony" },
    { id: "soc-2", platform: "Instagram", url: "https://instagram.com/svetikony" },
    { id: "soc-3", platform: "YouTube", url: "https://youtube.com/@svetikony" },
  ],
  translations: {
    uk: {
      language: "uk",
      name: "Храм Світлих Ікон",
      description: "Парафія, що зберігає традиції іконопису та богослужіння.",
      history:
        "Заснований у ХІХ столітті, храм пройшов через випробування часу, зберігаючи спадщину...",
      seoTitle: "Храм Світлих Ікон — офіційний сайт",
      seoDescription: "Розклад богослужінь, історія храму, каталог ікон і духовна література.",
    },
    ru: {
      language: "ru",
      name: "Храм Светлых Икон",
      description: "Приход, сохраняющий традиции иконописи и богослужения.",
      history:
        "Основан в XIX веке, храм прошёл через испытания времени, сохраняя наследие...",
      seoTitle: "Храм Светлых Икон — официальный сайт",
      seoDescription: "Расписание богослужений, история храма, каталог икон и духовная литература.",
    },
    en: {
      language: "en",
      name: "Church of the Radiant Icons",
      description: "A parish preserving the traditions of icon painting and worship.",
      history: "Founded in the 19th century, the church has endured through time, preserving its heritage...",
      seoTitle: "Church of the Radiant Icons — Official Site",
      seoDescription: "Service schedule, church history, icon catalog, and spiritual literature.",
    },
  },
  createdAt: now,
  updatedAt: now,
};
