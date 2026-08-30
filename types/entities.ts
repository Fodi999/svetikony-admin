/**
 * Domain entity types shared by the mock adapter (Stage 1) and the future
 * HTTP adapter (Stage 2). These mirror the production data model as
 * understood today; Stage 2 must reconcile them against real API responses
 * before wiring the HTTP adapter.
 */

export type Language = "uk" | "ru" | "en";

export const LANGUAGES: Language[] = ["uk", "ru", "en"];

export type ContentStatus = "draft" | "published" | "archived";

export type Role = "super_admin" | "editor" | "order_manager" | "viewer";

export interface Timestamps {
  createdAt: string;
  updatedAt: string;
}

export interface Identifiable {
  id: string;
}

/** A group of per-language records that represent the same logical content item. */
export interface Translatable {
  translationGroupId: string;
  language: Language;
}

export interface ImageAsset {
  id: string;
  url: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface MediaAsset extends Identifiable, Timestamps {
  url: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  kind: "image" | "audio" | "document";
  alt?: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
}

/** `id` is `Identifiable`'s string form of the D1 row's numeric primary
 * key (`String(row.id)`) — kept consistent with every other entity's id
 * type even though Telegram's own tables use INTEGER, not UUID. */
export interface TelegramUser extends Identifiable, Timestamps {
  telegramUserId: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  languageCode: string | null;
  isBot: boolean;
  isActive: boolean;
}

export interface TelegramChat extends Identifiable, Timestamps {
  telegramChatId: number;
  chatType: string;
  title: string | null;
  username: string | null;
  isActive: boolean;
}

export type TelegramPostStatus = "draft" | "scheduled" | "sent" | "failed";

export interface TelegramPost extends Identifiable, Timestamps {
  sourceType: string | null;
  sourceId: string | null;
  text: string | null;
  mediaUrl: string | null;
  telegramMessageId: number | null;
  status: TelegramPostStatus;
  scheduledAt: string | null;
  sentAt: string | null;
  errorMessage: string | null;
  /** Set only for autopost-generated rows — null for manually-composed
   * posts. See features/telegram/autopost-tab.tsx's history list. */
  contentType: AutopostContentType | null;
  publishDate: string | null;
}

export const AUTOPOST_CONTENT_TYPES = ["morning_prayer", "saint_of_day", "gospel", "faith_story", "evening_prayer"] as const;
export type AutopostContentType = (typeof AUTOPOST_CONTENT_TYPES)[number];

export const AUTOPOST_CONTENT_TYPE_LABELS: Record<AutopostContentType, string> = {
  morning_prayer: "Ранкова молитва",
  saint_of_day: "Святий дня",
  gospel: "Євангеліє дня",
  faith_story: "Історія віри",
  evening_prayer: "Вечірня молитва",
};

export interface AutopostSetting {
  contentType: AutopostContentType;
  enabled: boolean;
  /** 'HH:MM', Europe/Kyiv wall-clock. */
  scheduleTime: string;
}

export interface TelegramAutopostSettings {
  globalEnabled: boolean;
  items: AutopostSetting[];
}

export interface TelegramTodayContent {
  calendarDay: { id: string; title: string; description: string } | null;
  saint: { id: string; name: string; shortDescription: string } | null;
  prayer: { id: string; title: string; text: string } | null;
  gospel: { id: string; title: string; reference: string; text: string } | null;
  article: { id: string; title: string; content: string } | null;
  imageUrl: string | null;
}

export interface TelegramDashboardStatus {
  configured: boolean;
  channel: string | null;
  webhook: { url: string; pendingUpdateCount: number; lastErrorMessage: string | null } | null;
  stats: { userCount: number; chatCount: number; lastActivityAt: string | null };
}

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------

export type CalendarEventType =
  | "feast"
  | "fast"
  | "memorial"
  | "liturgical"
  | "civil";

export interface CalendarDay extends Identifiable, Timestamps, Translatable {
  date: string; // ISO date, e.g. "2026-08-19"
  title: string;
  slug: string;
  shortDescription: string;
  history?: string;
  eventType: CalendarEventType;
  status: ContentStatus;
  imageId?: string;
  relatedIconIds: string[];
  relatedPrayerIds: string[];
  relatedSaintIds: string[];
  relatedGospelIds: string[];
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

export interface Icon extends Identifiable, Timestamps, Translatable {
  slug: string;
  title: string;
  description: string;
  history?: string;
  saintImageDescription?: string;
  materials?: string;
  dimensions?: string;
  mainImageId?: string;
  galleryImageIds: string[];
  relatedPrayerIds: string[];
  relatedArticleIds: string[];
  relatedCalendarDayIds: string[];
  status: ContentStatus;
}

// ---------------------------------------------------------------------------
// Prayers
// ---------------------------------------------------------------------------

export type PrayerType =
  | "morning"
  | "evening"
  | "before_meal"
  | "after_meal"
  | "to_saint"
  | "to_icon"
  | "feast"
  | "general";

export type ParticleColorMode = "single" | "gradient" | "theme";

export interface SubtitleCue {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
}

export interface SceneTimelineEvent {
  id: string;
  atMs: number;
  label: string;
  intensity: number; // 0..1
}

export interface Prayer extends Identifiable, Timestamps {
  title: string;
  slug: string;
  text: string;
  language: Language;
  prayerType: PrayerType;
  status: ContentStatus;
  iconId?: string;
  calendarDayId?: string;
  audioUrl?: string;
  qrCodeUrl?: string;
  imageUrl?: string;
  source?: string;
  sourceUrl?: string;
  note?: string;

  visualizerEnabled: boolean;
  visualizerImageUrl?: string;
  particleCountDesktop: number;
  particleCountMobile: number;
  particleSize: number;
  particleColorMode: ParticleColorMode;
  backgroundColor: string;
  audioReactivity: number; // 0..1
  sceneTimeline: SceneTimelineEvent[];
  subtitleCues: SubtitleCue[];
}

// ---------------------------------------------------------------------------
// Saints
// ---------------------------------------------------------------------------

export interface Saint extends Identifiable, Timestamps, Translatable {
  name: string;
  slug: string;
  shortDescription: string;
  biography: string;
  feastDayOldStyle?: string; // "MM-DD"
  feastDayNewStyle?: string; // "MM-DD"
  imageId?: string;
  status: ContentStatus;
  relatedIconIds: string[];
  relatedCalendarDayIds: string[];
}

// ---------------------------------------------------------------------------
// Gospel readings
// ---------------------------------------------------------------------------

export interface GospelReading extends Identifiable, Timestamps, Translatable {
  title: string;
  slug: string;
  reference: string; // e.g. "John 1:1-17"
  text: string;
  explanation?: string;
  status: ContentStatus;
  relatedCalendarDayIds: string[];
}

// ---------------------------------------------------------------------------
// Articles
// ---------------------------------------------------------------------------

export interface Article extends Identifiable, Timestamps, Translatable {
  title: string;
  slug: string;
  content: string;
  seoTitle?: string;
  seoDescription?: string;
  status: ContentStatus;
  coverImageId?: string;
  relatedIconIds: string[];
  relatedSaintIds: string[];
}

// ---------------------------------------------------------------------------
// Alphabet
// ---------------------------------------------------------------------------

export interface AlphabetLetter extends Identifiable, Timestamps, Translatable {
  slug: string;
  order: number;
  name: string;
  pronunciation?: string;
  description?: string;
  historicalNote?: string;
  numericValue?: number;
  mainImageId?: string;
}

// ---------------------------------------------------------------------------
// Church info (singleton)
// ---------------------------------------------------------------------------

export interface ChurchScheduleEntry {
  id: string;
  dayLabel: string;
  serviceName: string;
  time: string;
}

export interface ChurchSocialLink {
  id: string;
  platform: string;
  url: string;
}

export interface ChurchInfoTranslation {
  language: Language;
  name: string;
  description: string;
  history: string;
  seoTitle?: string;
  seoDescription?: string;
}

export interface ChurchInfo extends Timestamps {
  address: string;
  phone?: string;
  email?: string;
  logoImageId?: string;
  coverImageIds: string[];
  schedule: ChurchScheduleEntry[];
  socialLinks: ChurchSocialLink[];
  translations: Record<Language, ChurchInfoTranslation>;
}

// ---------------------------------------------------------------------------
// Catalog: categories & products
// ---------------------------------------------------------------------------

export interface ProductCategory extends Identifiable, Timestamps {
  name: string;
  slug: string;
  description?: string;
  imageId?: string;
  order: number;
  active: boolean;
}

export type StockStatus = "in_stock" | "made_to_order" | "out_of_stock";

export interface ProductVariant {
  id: string;
  label: string;
  priceOverride?: number;
  sku?: string;
}

export interface Product extends Identifiable, Timestamps {
  title: string;
  slug: string;
  description: string;
  price: number;
  currency: string;
  stockStatus: StockStatus;
  featured: boolean;
  active: boolean;
  imageIds: string[];
  categoryId: string;
  linkedIconId?: string;
  dimensions?: string;
  materials?: string;
  productionTimeDays?: number;
  consecrated: boolean;
  variants: ProductVariant[];
  seoTitle?: string;
  seoDescription?: string;
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export type OrderStatus = "new" | "in_progress" | "completed" | "cancelled";
export type OrderType = "icon_order" | "product_order" | "custom_request";

export interface OrderItem {
  id: string;
  productId?: string;
  title: string;
  quantity: number;
  unitPrice: number;
  currency: string;
}

export interface OrderStatusHistoryEntry {
  id: string;
  status: OrderStatus;
  changedAt: string;
  note?: string;
}

export interface Order extends Identifiable, Timestamps {
  number: string;
  customerName: string;
  phone: string;
  email?: string;
  amount: number;
  currency: string;
  status: OrderStatus;
  isRead: boolean;
  orderType: OrderType;
  items: OrderItem[];
  comment?: string;
  internalNote?: string;
  statusHistory: OrderStatusHistoryEntry[];
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string;
}
