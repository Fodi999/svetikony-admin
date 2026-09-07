import type { ChurchInfo } from "@/types/entities";

const now = new Date().toISOString();

export const mockChurchInfo: ChurchInfo = {
  id: "church-info-singleton",
  address: "вул. Хрещатик, 1, Київ, Україна, 01001",
  mapsUrl: "https://maps.google.com/?q=50.4501,30.5234",
  phoneOrSite: "https://svetikony.com",
  priestPhone: "+380 44 123 45 67",
  imageUrl: "https://svetikony.com/media/church/exterior.jpg",
  status: "published",
  translations: {
    uk: {
      title: "Храм Світлих Ікон",
      description: "Парафія, що зберігає традиції іконопису та богослужіння.",
      schedule: "Нд 09:00 — Божественна літургія, Сб 17:00 — Вечірня, щодня 08:00 — Утреня.",
      dedication: "на честь Покрови Пресвятої Богородиці",
      priest: "протоієрей Іван Іванов",
      shrines: "Чудотворна ікона Покрови Пресвятої Богородиці.",
    },
    ru: {
      title: "Храм Светлых Икон",
      description: "Приход, сохраняющий традиции иконописи и богослужения.",
      schedule: "Вс 09:00 — Божественная литургия, Сб 17:00 — Вечерня, ежедневно 08:00 — Утреня.",
      dedication: "в честь Покрова Пресвятой Богородицы",
      priest: "протоиерей Иван Иванов",
      shrines: "Чудотворная икона Покрова Пресвятой Богородицы.",
    },
    en: {
      title: "Church of the Radiant Icons",
      description: "A parish preserving the traditions of icon painting and worship.",
      schedule: "Sun 09:00 — Divine Liturgy, Sat 17:00 — Vespers, daily 08:00 — Matins.",
      dedication: "in honor of the Protection of the Most Holy Theotokos",
      priest: "Archpriest Ivan Ivanov",
      shrines: "Miraculous icon of the Protection of the Most Holy Theotokos.",
    },
  },
  createdAt: now,
  updatedAt: now,
};
