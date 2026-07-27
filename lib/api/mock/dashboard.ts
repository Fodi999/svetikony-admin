import type { DashboardStats } from "@/lib/api/client";
import { articlesResource } from "@/lib/api/mock/articles";
import { calendarDaysResource } from "@/lib/api/mock/calendar";
import { gospelReadingsResource } from "@/lib/api/mock/gospel";
import { iconsResource } from "@/lib/api/mock/icons";
import { ordersResource } from "@/lib/api/mock/orders";
import { prayersResource } from "@/lib/api/mock/prayers";
import { saintsResource } from "@/lib/api/mock/saints";
import { mockDelay } from "@/lib/api/mock-utils";
import type { CalendarDay, Language, Translatable } from "@/types/entities";

const LANGUAGES: Language[] = ["uk", "ru", "en"];
const ALL = { pageSize: 10_000 };

function countMissingTranslationGroups(items: Translatable[]): number {
  const byGroup = new Map<string, Set<Language>>();
  for (const item of items) {
    const set = byGroup.get(item.translationGroupId) ?? new Set<Language>();
    set.add(item.language);
    byGroup.set(item.translationGroupId, set);
  }
  let missing = 0;
  for (const languages of byGroup.values()) {
    if (languages.size < LANGUAGES.length) missing += 1;
  }
  return missing;
}

export const dashboardResource = {
  async getStats(): Promise<DashboardStats> {
    await mockDelay(300);

    const [icons, prayers, saints, gospelReadings, articles, calendarDays, orders] = await Promise.all([
      iconsResource.list(ALL),
      prayersResource.list(ALL),
      saintsResource.list(ALL),
      gospelReadingsResource.list(ALL),
      articlesResource.list(ALL),
      calendarDaysResource.list(ALL),
      ordersResource.list(ALL),
    ]);

    const contentItems = [
      ...icons.items,
      ...prayers.items,
      ...saints.items,
      ...gospelReadings.items,
      ...articles.items,
      ...calendarDays.items,
    ];
    const drafts = contentItems.filter((item) => item.status === "draft").length;
    const published = contentItems.filter((item) => item.status === "published").length;

    const today = new Date().toISOString().slice(0, 10);
    const upcomingCalendarDays: CalendarDay[] = calendarDays.items
      .filter((day) => day.language === "uk" && day.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5);

    const missingTranslations =
      countMissingTranslationGroups(icons.items) +
      countMissingTranslationGroups(saints.items) +
      countMissingTranslationGroups(gospelReadings.items) +
      countMissingTranslationGroups(articles.items) +
      countMissingTranslationGroups(calendarDays.items);

    const missingImages =
      icons.items.filter((icon) => !icon.mainImageId).length +
      articles.items.filter((article) => !article.coverImageId).length +
      saints.items.filter((saint) => !saint.imageId).length;

    const prayersWithoutAudio = prayers.items.filter((prayer) => !prayer.audioUrl).length;

    return {
      newOrders: orders.items.filter((o) => o.status === "new").length,
      unreadOrders: orders.items.filter((o) => !o.isRead).length,
      drafts,
      published,
      upcomingCalendarDays,
      missingTranslations,
      missingImages,
      prayersWithoutAudio,
      // Stage 1 has no real upload pipeline; this illustrates the dashboard tile only.
      mediaUploadErrors: 1,
    };
  },
};
