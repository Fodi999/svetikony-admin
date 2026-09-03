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

/** 'ready' and 'sending' were added for Content Plan Stage 2's admin-
 * prepared autopost slots: 'ready' means an admin confirmed a slot's text/
 * image are good to publish without further AI generation; 'sending' is
 * the short-lived state a slot occupies between the autopost tick's
 * atomic claim and the actual Telegram send completing. See
 * features/telegram/content-plan/. */
export type TelegramPostStatus = "draft" | "scheduled" | "sent" | "failed" | "ready" | "sending";

export interface TelegramPost extends Identifiable, Timestamps {
  sourceType: string | null;
  sourceId: string | null;
  text: string | null;
  mediaUrl: string | null;
  /** Manually-assigned audio URL -- parallel to mediaUrl, never
   * AI-generated. See features/telegram/content-plan/slot-card.tsx. */
  audioUrl: string | null;
  telegramMessageId: number | null;
  status: TelegramPostStatus;
  scheduledAt: string | null;
  sentAt: string | null;
  errorMessage: string | null;
  /** Set only for autopost-generated rows — null for manually-composed
   * posts. See features/telegram/autopost-tab.tsx's history list. */
  contentType: AutopostContentType | null;
  publishDate: string | null;
  /** Pre-publish calendar verification outcome -- only ever set for
   * content types that require it (saint_of_day); null for every other
   * type and for rows predating the feature. Never treat null as
   * "verified". See features/telegram/autopost-tab.tsx. */
  verificationStatus: string | null;
  verificationError: string | null;
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

/** Short, space-constrained labels for the Content Plan day-cell grid --
 * full names (AUTOPOST_CONTENT_TYPE_LABELS above) go in tooltips instead.
 * See features/telegram/content-plan/. */
export const AUTOPOST_CONTENT_TYPE_SHORT_LABELS: Record<AutopostContentType, string> = {
  morning_prayer: "Ранкова",
  saint_of_day: "Святий",
  gospel: "Євангеліє",
  faith_story: "Історія",
  evening_prayer: "Вечірня",
};

/** 'SENDING' (Content Plan Stage 3A) is the short-lived state a slot
 * occupies between the autopost tick's atomic ready->sending claim and the
 * send completing -- distinct from 'READY' so the UI never shows mutation
 * buttons for a slot that may complete sending at any moment. */
export type ContentPlanSlotStatus = "SENT" | "SENDING" | "READY" | "DRAFT" | "SOURCE_READY" | "MISSING_SOURCE" | "REVIEW_REQUIRED" | "FAILED";

export interface ContentPlanSlot {
  contentType: AutopostContentType;
  scheduledTime: string;
  sourceStatus: "available" | "missing_source" | "insufficient_data";
  verificationStatus: "verified" | "failed" | null;
  publicationStatus: ContentPlanSlotStatus;
  textAvailable: boolean;
  imageAvailable: boolean;
  /** Manually-assigned audio (never a "source" fallback, unlike
   * imageAvailable -- see the BFF contract's own doc comment). */
  audioAvailable: boolean;
  sentAt: string | null;
  telegramMessageId: number | null;
  errorMessage: string | null;
  /** Detail-only -- present only on a day fetched via contentPlan.getDay(),
   * always absent from contentPlan.get()'s bulk year/range list. */
  textPreview?: string;
  imageUrl?: string;
  /** Detail-only, same reasoning as imageUrl -- the assigned audio file's
   * public URL. */
  audioUrl?: string;
  /** Untruncated current text -- what the text editor/preview actually
   * use; textPreview stays capped at ~200 chars for lighter display. */
  fullText?: string;
  /** What production delivery would actually send, computed server-side
   * via the real planDelivery() -- see features/telegram/content-plan/
   * preview-dialog.tsx, never reimplemented client-side. */
  deliveryPreview?: {
    kind: "text_only" | "photo_with_caption" | "photo_then_text" | "audio_then_text" | "photo_and_audio_then_text";
    photoCaption: string | null;
    audioCaption: string | null;
  };
}

export interface ContentPlanDay {
  civilDate: string;
  julianDate: string;
  calendarTitle: string | null;
  /** church_calendar_days.id for this date, when a row exists -- lets the
   * Day Drawer link back to "Церковний календар", the canonical source
   * (see features/telegram/content-plan/day-drawer.tsx). Null exactly when
   * calendarTitle is null. */
  calendarDayId: string | null;
  slots: Record<AutopostContentType, ContentPlanSlot>;
}

export interface ContentPlanSummary {
  totalDays: number;
  sent: number;
  ready: number;
  draft: number;
  sourceReady: number;
  missingSource: number;
  reviewRequired: number;
  failed: number;
  coverage: Record<AutopostContentType, { available: number; missing: number }>;
}

export interface ContentPlanReport {
  generatedAt: string;
  fromCivilDate: string;
  toCivilDate: string;
  days: ContentPlanDay[];
  summary: ContentPlanSummary;
}

export interface ContentPlanQuery {
  year?: number;
  from?: string;
  to?: string;
}

/** Outcome of one slot in a "Підготувати весь день" run -- see
 * TelegramApi.contentPlan.prepareDay. 'already_prepared' means both text
 * and image already existed (nothing to do); 'image_failed' means text was
 * filled but the (non-fatal, best-effort) image step failed -- the slot is
 * still a usable draft either way. */
export type PrepareDaySlotOutcome =
  | "prepared"
  | "already_prepared"
  | "skipped_ready"
  | "skipped_sent"
  | "skipped_sending"
  | "missing_source"
  | "review_required"
  | "image_failed"
  | "failed";

export interface PrepareDaySlotResult {
  contentType: AutopostContentType;
  result: PrepareDaySlotOutcome;
  error?: string;
}

export interface PrepareDayReport {
  date: string;
  total: number;
  prepared: number;
  alreadyPrepared: number;
  skippedReady: number;
  skippedSent: number;
  skippedSending: number;
  missingSource: number;
  reviewRequired: number;
  imageFailed: number;
  failed: number;
  results: PrepareDaySlotResult[];
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

/** Read-only provenance of `imageId` -- see CalendarAiFillResult and
 * features/calendar/calendar-day-form.tsx's Media tab display. Never part
 * of CalendarDayFormValues/calendarDaySchema: this is set exclusively by
 * the AI image actions server-side, never submitted back on save. */
export interface CalendarImageMetadata {
  origin: "ai_generated" | "manual";
  referenceProvider?: "wikipedia" | "commons";
  referenceLanguage?: "uk" | "ru" | "en";
  referencePageUrl?: string;
  referenceImageUrl?: string;
  referenceTitle?: string;
  referenceAuthor?: string;
  referenceLicense?: string;
  referenceAttribution?: string;
  wikidataId?: string;
  commonsFileTitle?: string;
  commonsCategory?: string;
  identityVerified: boolean;
  fallbackReason?: string;
  /** Set when the admin typed their own English prompt instead of relying
   * on the automatic saint-reference resolver -- see the Media tab's
   * "Промпт для AI" field and svet-ikony's generateCalendarImageFromPrompt(). */
  customPrompt?: string;
}

export interface CalendarDay extends Identifiable, Timestamps, Translatable {
  date: string; // ISO date, e.g. "2026-08-19"
  /** Julian/old-style ISO date, straight from the Worker's `dateOldStyle`
   * column -- never recomputed here. Undefined in mock mode (seed data
   * doesn't carry it); UI must degrade gracefully when absent. */
  dateOldStyle?: string | null;
  title: string;
  slug: string;
  shortDescription: string;
  history?: string;
  eventType: CalendarEventType;
  status: ContentStatus;
  imageId?: string;
  /** Admin-curated SEO overrides for the public day page -- null/undefined
   * means "not set yet", falls back to title/shortDescription. */
  seoTitle?: string | null;
  seoDescription?: string | null;
  imageMetadata?: CalendarImageMetadata | null;
  relatedIconIds: string[];
  relatedPrayerIds: string[];
  relatedSaintIds: string[];
  relatedGospelIds: string[];
}

/** Outcome of "Заповнити відсутнє з AI" -- see CalendarAiApi.fillMissing. */
export type CalendarAiField = "description" | "history" | "seo" | "image";
export interface CalendarAiFillResult {
  day: CalendarDay;
  filled: CalendarAiField[];
  skipped: { field: CalendarAiField; reason: "missing_source" | "review_required" | "failed" }[];
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
