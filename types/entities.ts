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

export const AUTOPOST_CONTENT_TYPES = [
  "morning_prayer",
  "saint_of_day",
  "gospel",
  "faith_story",
  "evening_prayer",
] as const;
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
export type ContentPlanSlotStatus =
  | "SENT"
  | "SENDING"
  | "READY"
  | "DRAFT"
  | "SOURCE_READY"
  | "MISSING_SOURCE"
  | "REVIEW_REQUIRED"
  | "FAILED";

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
    kind:
      | "text_only"
      | "photo_with_caption"
      | "photo_then_text"
      | "audio_then_text"
      | "photo_and_audio_then_text";
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

export type CalendarEventType = "feast" | "fast" | "memorial" | "liturgical" | "civil";

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

export interface Prayer extends Identifiable, Timestamps, Translatable {
  title: string;
  slug: string;
  text: string;
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

/**
 * Phase 2B-3: field shape matches svet-ikony's real church_gospel_readings
 * table exactly (verified against lib/d1/repositories/gospel.ts, not
 * assumed). `calendarDayId` (singular) replaces the old
 * `relatedCalendarDayIds` (plural) — the real backend has a real, singular
 * `calendar_day_id` FK, so the admin now edits exactly that relation
 * instead of a multi-select the backend could never fully honor (same
 * reasoning as Article's `iconId`). PHASE MULTILINGUAL-4: `translationGroupId`
 * (required by Translatable) is now a real backend field too — migration
 * 0017_articles_gospel_translation_group.sql (svet-ikony) added
 * `translation_group_id` to church_gospel_readings, and gospel.ts's
 * create/update auto-link it by slug, same as Icons/Prayers/Saints — see
 * lib/api/http/gospel.ts's toEntity() and the new TranslationSwitcher
 * wiring in features/gospel/gospel-form.tsx. No image/cover field:
 * church_gospel_readings has none, same as articles.
 */
export interface GospelReading extends Identifiable, Timestamps, Translatable {
  title: string;
  slug: string;
  reference: string; // e.g. "John 1:1-17"
  text: string;
  explanation?: string;
  status: ContentStatus;
  calendarDayId?: string;
}

// ---------------------------------------------------------------------------
// Articles
// ---------------------------------------------------------------------------

/**
 * Phase 2B-2: field shape matches svet-ikony's real church_articles table
 * exactly (verified against lib/d1/repositories/articles.ts, not assumed).
 * Deliberately does NOT have `coverImageId`/`relatedSaintIds` — the real
 * backend has no image column and no saint-relation column of any kind for
 * articles, so those Stage-1 mock fields were removed rather than kept as
 * editable-but-silently-discarded UI controls. `iconId` (singular) replaces
 * the old `relatedIconIds` (plural) for the same reason in the other
 * direction: church_articles has a real, singular `icon_id` FK, so the
 * admin now edits exactly that relation instead of a multi-select the
 * backend could never fully honor. PHASE MULTILINGUAL-4: `translationGroupId`
 * (required by Translatable) is now a real backend field too — migration
 * 0017_articles_gospel_translation_group.sql (svet-ikony) added
 * `translation_group_id` to church_articles, and articles.ts's
 * create/update auto-link it by slug, same as Icons/Prayers/Saints — see
 * lib/api/http/articles.ts's toEntity() and the new TranslationSwitcher
 * wiring in features/articles/article-form.tsx.
 */
export interface Article extends Identifiable, Timestamps, Translatable {
  title: string;
  slug: string;
  content: string;
  seoTitle?: string;
  seoDescription?: string;
  status: ContentStatus;
  iconId?: string;
}

// ---------------------------------------------------------------------------
// Alphabet
// ---------------------------------------------------------------------------

export interface AlphabetLetter extends Identifiable, Timestamps, Translatable {
  slug: string;
  order: number;
  /** The single-glyph display form (e.g. "Б"), distinct from `name` (e.g.
   * "Буки") -- required by the backend's createAlphabetLetter (rejects an
   * empty value). Rendered large on the public letter page when no
   * mainImageId is set. */
  letter: string;
  name: string;
  pronunciation?: string;
  description?: string;
  historicalNote?: string;
  numericValue?: number;
  mainImageId?: string;
  /** Per-letter narration audio for this language row -- narrates
   * `historicalNote`, not a separate script (see alphabet-letter-form.tsx). */
  audioUrl?: string;
}

// ---------------------------------------------------------------------------
// Visualizer ("Візуалізатор" -- 3D historical/biblical events)
// ---------------------------------------------------------------------------

export type VisualizerEventType =
  "biblical" | "church_history" | "historical" | "saint" | "council" | "location" | "other";

/** Not every historical/biblical event can honestly carry an exact date --
 * `chronologyType` says how much confidence `displayDate`/`yearStart`/
 * `century` actually carry, so the public visualizer can show "Traditional
 * dating" instead of presenting a fabricated precise date as fact. */
export type VisualizerChronologyType =
  "exact" | "approximate" | "traditional" | "period" | "unknown";

export type VisualizerEra =
  | "biblical_creation"
  | "biblical_old_testament"
  | "biblical_new_testament"
  | "apostolic"
  | "early_church"
  | "byzantine"
  | "medieval"
  | "modern"
  | "contemporary"
  | "custom";

export type VisualizerCalendarEra = "BC" | "AD" | "unknown";

export interface VisualizerEvent extends Identifiable, Timestamps, Translatable {
  slug: string;
  title: string;
  summary?: string;
  description?: string;
  eventType: VisualizerEventType;
  chronologyType: VisualizerChronologyType;
  era: VisualizerEra;
  calendarEra: VisualizerCalendarEra;
  yearStart?: number;
  yearEnd?: number;
  century?: number;
  /** Human-authored date/period text (e.g. "Традиційна біблійна хронологія")
   * -- shown to visitors instead of/alongside the machine `sortYear`, which
   * exists purely for ordering and is never rendered directly. */
  sortYear?: number;
  displayDate?: string;
  locationName?: string;
  latitude?: number;
  longitude?: number;
  /** Optional link to an existing church_calendar_days row -- see
   * lib/d1/repositories/visualizerEvents.ts in svet-ikony. Selected through the event form’s calendar picker. */
  calendarDayId?: string;
  status: ContentStatus;
  isFeatured: boolean;
  publishedAt?: string;
}

export interface VisualizerModel extends Identifiable, Timestamps {
  /** The event TRANSLATION GROUP this model belongs to (shared across its
   * uk/ru/en rows, not one specific language row) -- undefined for a
   * standalone model, in practice always the Base Earth Model. */
  eventGroupId?: string;
  title?: string;
  /** Bare R2 key (Saints/Alphabet-photo convention) -- resolved to a
   * displayable/loadable URL via resolveMediaPreviewUrl(). */
  r2Key: string;
  filename?: string;
  mimeType?: string;
  fileSize?: number;
  isBaseEarth: boolean;
  sortOrder: number;
}

// ---------------------------------------------------------------------------
// Church info (singleton)
// ---------------------------------------------------------------------------

/**
 * Phase 2B-4: field shape matches svet-ikony's real church_info table
 * exactly (verified against lib/d1/repositories/churchInfo.ts, not
 * assumed). Singleton, confirmed from three independent sources: the
 * schema's own comment ("exactly one row expected to ever exist"), the
 * repository's get-one/upsert-one implementation (no list/create-many),
 * and the fact the real backend has no [id] route at all — only GET/PUT
 * on the collection path itself.
 *
 * Removed entirely (no backend column of any kind): `phone`+`email`
 * (replaced by the single real `phoneOrSite` field below — the backend
 * genuinely only stores one combined contact string, not two), `schedule`
 * (was a structured array; the real backend only has a per-locale free
 * text string — see `ChurchInfoTranslation.schedule`), `socialLinks`,
 * `logoImageId`/`coverImageIds` (replaced by the real `imageUrl` — a
 * plain URL string, not a media-library id), translation-level `history`/
 * `seoTitle`/`seoDescription` (no backend equivalent for this entity).
 *
 * Added (real backend + real public-page fields the admin never exposed
 * before): `mapsUrl`, `priestPhone`, `status` (critical — the public
 * /churches page gates ALL rendering on `status === 'published'`, so
 * without this field the admin had no way to ever publish this page),
 * and per-locale `schedule`/`dedication`/`shrines`/`priest`.
 */
export interface ChurchInfoTranslation {
  title: string;
  description: string;
  schedule: string;
  dedication: string;
  shrines: string;
  priest: string;
}

export interface ChurchInfo extends Identifiable, Timestamps {
  address: string;
  mapsUrl?: string;
  phoneOrSite?: string;
  priestPhone?: string;
  imageUrl?: string;
  status: ContentStatus;
  translations: Record<Language, ChurchInfoTranslation>;
}

// ---------------------------------------------------------------------------
// Catalog: categories & products
// ---------------------------------------------------------------------------

/**
 * Phase MULTILINGUAL-1 (P1.2): icon_product_categories is a single-row-
 * per-category table with per-language COLUMNS (name_uk/name_ru/name_en,
 * description_uk/description_ru/description_en) -- not row-per-language
 * like Icons. `name`/`description` above stay as read-only convenience
 * fields (always mirroring `translations.uk`, same value the real
 * backend's nameUk/descriptionUk columns hold) so every existing list-
 * view/breadcrumb/delete-dialog consumer keeps working unchanged; the
 * admin form itself now edits ONLY `translations.{uk,ru,en}`, matching
 * ChurchInfoTranslation's precedent (Church Info has no flat `title` at
 * all, only `translations`) -- see category-form.tsx.
 */
export interface ProductCategoryTranslation {
  name: string;
  description: string;
}

export interface ProductCategory extends Identifiable, Timestamps {
  name: string;
  slug: string;
  description?: string;
  imageId?: string;
  order: number;
  active: boolean;
  translations: Record<Language, ProductCategoryTranslation>;
}

export type StockStatus = "in_stock" | "made_to_order" | "out_of_stock";

export interface ProductVariant {
  id: string;
  label: string;
  priceOverride?: number;
  sku?: string;
}

/**
 * Phase MULTILINGUAL-1 (P1.1): icon_order_options (DTO ChurchProductDto) is
 * a single-row-per-product table with per-language COLUMNS for name_*,
 * full_description_*, seo_title_* and seo_description_* -- same
 * column-per-language shape as categories, not row-per-language like
 * Icons. The plain `description` column (mapped to `Product.description`
 * below) has no *_ru/*_en variant in the schema at all and stays a single
 * flat field, unlike `fullDescription`, which does. `title`/`seoTitle`/
 * `seoDescription` stay as read-only convenience fields mirroring
 * `translations.uk` (same reasoning as ProductCategory above) for existing
 * list-view/breadcrumb/delete-dialog consumers; the admin form edits only
 * `translations.{uk,ru,en}` -- see product-form.tsx.
 */
export interface ProductTranslation {
  title: string;
  fullDescription: string;
  seoTitle: string;
  seoDescription: string;
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
  translations: Record<Language, ProductTranslation>;
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

/**
 * Phase 2B-5B: the authoritative 8 values, verified identical in two
 * independent places in svet-ikony (the D1 CHECK constraint and
 * lib/d1/repositories/orders.ts's own ORDER_STATUSES validation list) —
 * not the old 4-value admin-only enum. `in_progress` (the old admin-only
 * value) is retired entirely, per your explicit decision: it had no
 * backend counterpart at all, not even as a subset of one of these 8.
 */
export type OrderStatus =
  | "new"
  | "contacted"
  | "confirmed"
  | "in_production"
  | "ready"
  | "shipped"
  | "completed"
  | "cancelled";

/** Mirrors svet-ikony's IconOrderItemDto field-for-field (Phase 2B-5B) —
 * `optionNameSnapshot`/`priceCentsSnapshot` are real snapshots taken at
 * order-creation time, never live Product data (see the phase report's
 * PRICE SNAPSHOT / ORDER SNAPSHOT DISPLAY sections) — do not resolve
 * `optionId` back to a current product to "refresh" these values. */
export interface OrderItem {
  id: string;
  optionId?: string;
  optionNameSnapshot: string;
  priceCentsSnapshot: number;
  quantity: number;
}

/**
 * Phase 2B-5B: field shape matches svet-ikony's real ChurchIconOrderDto
 * field-for-field (verified against lib/d1/repositories/orders.ts, not
 * assumed). No `orderType`: the backend has no such literal field —
 * whether this is a plain icon order or a product order is inferable from
 * whether `primaryProductId` is set, not a stored enum (the old
 * `"custom_request"` value never had any backend basis at all). No
 * `statusHistory`: no history table exists anywhere in svet-ikony —
 * removed per your explicit decision rather than kept as fabricated data
 * (a real audit-log-backed timeline is a possible future feature, not
 * this phase). `contactMethod`+`contactValue` (one tagged field) replaces
 * the old separate `phone`+`email?` (the real backend only ever stores
 * one contact value, tagged by which kind it is). `totalPriceCents`
 * (integer cents, matching the DB exactly) replaces the old ambiguous-
 * unit `amount` — see lib/utils/format-money.ts for display formatting;
 * the domain model itself never stores a floating decimal.
 */
export interface Order extends Identifiable, Timestamps {
  orderNumber: string;
  status: OrderStatus;
  isRead: boolean;
  customerName: string;
  contactMethod: "phone" | "email";
  contactValue: string;
  country?: string;
  city?: string;
  iconId?: string;
  iconTitleSnapshot?: string;
  iconSlugSnapshot?: string;
  primaryProductId?: string;
  primaryProductNameSnapshot?: string;
  primaryProductSlugSnapshot?: string;
  primaryProductPriceCentsSnapshot?: number;
  primaryProductPhotoSnapshot?: string;
  items: OrderItem[];
  totalPriceCents: number;
  currency: string;
  comment?: string;
  adminNote?: string;
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
