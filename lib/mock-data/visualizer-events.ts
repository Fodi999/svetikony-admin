import type { Language, VisualizerEvent, VisualizerModel } from "@/types/entities";

const now = new Date().toISOString();

type SeedEvent = {
  slug: string;
  groupId: string;
  translations: Record<Language, { title: string; summary: string; description: string; locationName: string }>;
  eventType: VisualizerEvent["eventType"];
  chronologyType: VisualizerEvent["chronologyType"];
  era: VisualizerEvent["era"];
  calendarEra: VisualizerEvent["calendarEra"];
  yearStart?: number;
  century?: number;
  displayDate: string;
  latitude?: number;
  longitude?: number;
};

const SEED_EVENTS: SeedEvent[] = [
  {
    slug: "khreshchennya-rusi",
    groupId: "vgrp-khreshchennya-rusi",
    translations: {
      uk: {
        title: "Хрещення Русі",
        summary: "Прийняття християнства як державної релігії Київською Руссю.",
        description: "У 988 році князь Володимир Великий охрестив Київську Русь, започаткувавши багатовікову православну традицію.",
        locationName: "Київ",
      },
      ru: {
        title: "Крещение Руси",
        summary: "Принятие христианства как государственной религии Киевской Русью.",
        description: "В 988 году князь Владимир Великий крестил Киевскую Русь, положив начало многовековой православной традиции.",
        locationName: "Киев",
      },
      en: {
        title: "Baptism of Rus",
        summary: "The adoption of Christianity as the state religion of Kyivan Rus.",
        description: "In 988, Prince Vladimir the Great baptized Kyivan Rus, beginning a centuries-long Orthodox tradition.",
        locationName: "Kyiv",
      },
    },
    eventType: "historical",
    chronologyType: "exact",
    era: "medieval",
    calendarEra: "AD",
    yearStart: 988,
    century: 10,
    displayDate: "988",
    latitude: 50.45,
    longitude: 30.52,
  },
  {
    slug: "rizdvo-hrystove",
    groupId: "vgrp-rizdvo-hrystove",
    translations: {
      uk: {
        title: "Різдво Христове",
        summary: "Народження Ісуса Христа у Вифлеємі.",
        description: "Традиційна дата й місце народження Ісуса Христа за євангельською оповіддю.",
        locationName: "Вифлеєм",
      },
      ru: {
        title: "Рождество Христово",
        summary: "Рождение Иисуса Христа в Вифлееме.",
        description: "Традиционные дата и место рождения Иисуса Христа согласно евангельскому повествованию.",
        locationName: "Вифлеем",
      },
      en: {
        title: "Nativity of Christ",
        summary: "The birth of Jesus Christ in Bethlehem.",
        description: "The traditional date and place of Jesus Christ's birth according to the Gospel accounts.",
        locationName: "Bethlehem",
      },
    },
    eventType: "biblical",
    chronologyType: "traditional",
    era: "biblical_new_testament",
    calendarEra: "AD",
    displayDate: "Традиційна біблійна хронологія",
    latitude: 31.7054,
    longitude: 35.2024,
  },
  {
    slug: "vyhid-z-egyptu",
    groupId: "vgrp-vyhid-z-egyptu",
    translations: {
      uk: {
        title: "Вихід з Єгипту",
        summary: "Визволення ізраїльського народу з єгипетського рабства.",
        description: "Біблійна оповідь про Мойсея, який вивів ізраїльський народ з Єгипту.",
        locationName: "Єгипет",
      },
      ru: {
        title: "Исход из Египта",
        summary: "Освобождение израильского народа из египетского рабства.",
        description: "Библейское повествование о Моисее, выведшем израильский народ из Египта.",
        locationName: "Египет",
      },
      en: {
        title: "The Exodus",
        summary: "The liberation of the Israelites from Egyptian slavery.",
        description: "The Biblical account of Moses leading the Israelites out of Egypt.",
        locationName: "Egypt",
      },
    },
    eventType: "biblical",
    chronologyType: "traditional",
    era: "biblical_old_testament",
    calendarEra: "BC",
    displayDate: "Традиційна біблійна хронологія",
    latitude: 30.0444,
    longitude: 31.2357,
  },
];

function buildEvent(seed: SeedEvent, language: Language): VisualizerEvent {
  const translation = seed.translations[language];
  return {
    id: `visualizer-${seed.slug}-${language}`,
    translationGroupId: seed.groupId,
    language,
    slug: seed.slug,
    title: translation.title,
    summary: translation.summary,
    description: translation.description,
    eventType: seed.eventType,
    chronologyType: seed.chronologyType,
    era: seed.era,
    calendarEra: seed.calendarEra,
    yearStart: seed.yearStart,
    century: seed.century,
    displayDate: seed.displayDate,
    locationName: translation.locationName,
    latitude: seed.latitude,
    longitude: seed.longitude,
    status: "published",
    isFeatured: false,
    createdAt: now,
    updatedAt: now,
  };
}

export const mockVisualizerEvents: VisualizerEvent[] = SEED_EVENTS.flatMap((seed) =>
  (["uk", "ru", "en"] as Language[]).map((language) => buildEvent(seed, language)),
);

export const mockVisualizerModels: VisualizerModel[] = [
  {
    id: "visualizer-model-earth-base",
    eventGroupId: undefined,
    title: "Earth (base)",
    r2Key: "media/visualizer/earth-base/model/00000000-0000-4000-8000-000000000000.glb",
    filename: "earth_web.glb",
    mimeType: "model/gltf-binary",
    fileSize: 4_200_000,
    isBaseEarth: true,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  },
];
