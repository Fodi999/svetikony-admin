import type { AlphabetLetterFormValues } from "@/lib/validation/alphabet.schema";
import type { ArticleFormValues } from "@/lib/validation/article.schema";
import type { CalendarDayFormValues } from "@/lib/validation/calendar.schema";
import type { ChurchInfoFormValues } from "@/lib/validation/church-info.schema";
import type { GospelReadingFormValues } from "@/lib/validation/gospel.schema";
import type { IconFormValues } from "@/lib/validation/icon.schema";
import type { LoginFormValues } from "@/lib/validation/auth.schema";
import type { OrderUpdateFormValues } from "@/lib/validation/order.schema";
import type { ProductCategoryFormValues } from "@/lib/validation/category.schema";
import type { PrayerFormValues } from "@/lib/validation/prayer.schema";
import type { ProductFormValues } from "@/lib/validation/product.schema";
import type { SaintFormValues } from "@/lib/validation/saint.schema";
import type { AutopostSettingsFormValues, TelegramPostFormValues } from "@/lib/validation/telegram.schema";
import type { ListQuery, MediaObjectDto, PaginatedResult } from "@/types/api";
import type {
  AlphabetLetter,
  Article,
  AuthUser,
  AutopostContentType,
  CalendarDay,
  ChurchInfo,
  ContentPlanDay,
  ContentPlanQuery,
  ContentPlanReport,
  GospelReading,
  Icon,
  MediaAsset,
  Order,
  OrderStatus,
  Prayer,
  Product,
  ProductCategory,
  Saint,
  TelegramAutopostSettings,
  TelegramChat,
  TelegramDashboardStatus,
  TelegramPost,
  TelegramTodayContent,
  TelegramUser,
} from "@/types/entities";

/** Generic CRUD contract shared by every content resource. */
export interface CrudResource<TEntity, TFormValues, TQuery extends ListQuery = ListQuery> {
  list(query?: TQuery): Promise<PaginatedResult<TEntity>>;
  get(id: string): Promise<TEntity>;
  create(values: TFormValues): Promise<TEntity>;
  update(id: string, values: TFormValues): Promise<TEntity>;
  remove(id: string): Promise<void>;
  /**
   * Adds a translation to an existing translation group instead of minting a
   * new one. Only implemented by translatable resources; the group id is
   * always server/adapter-assigned, never typed by a user in the UI.
   */
  createTranslation?(groupId: string, language: string, values: TFormValues): Promise<TEntity>;
}

export interface CalendarQuery extends ListQuery {
  month?: string; // "2026-08"
  status?: string;
  language?: string;
}

export interface TranslatableQuery extends ListQuery {
  language?: string;
  status?: string;
}

export interface ProductQuery extends ListQuery {
  categoryId?: string;
  active?: boolean;
  featured?: boolean;
}

export interface OrderQuery extends ListQuery {
  status?: OrderStatus | "unread";
  dateFrom?: string;
  dateTo?: string;
}

export interface DashboardStats {
  newOrders: number;
  unreadOrders: number;
  drafts: number;
  published: number;
  upcomingCalendarDays: CalendarDay[];
  missingTranslations: number;
  missingImages: number;
  prayersWithoutAudio: number;
  mediaUploadErrors: number;
}

export interface UploadProgressHandler {
  (progress: number): void;
}

export interface AuthSession {
  user: AuthUser;
  expiresAt: string;
}

export interface AuthApi {
  login(values: LoginFormValues): Promise<AuthSession>;
  logout(): Promise<void>;
  getSession(): Promise<AuthSession | null>;
}

export interface MediaApi {
  upload(file: File, onProgress?: UploadProgressHandler): Promise<MediaAsset>;
  list(): Promise<MediaAsset[]>;
  remove(id: string): Promise<void>;
  /**
   * Stage 2D: real R2-backed upload via svet-ikony's admin media endpoint.
   * Purely additive — `upload`/`list`/`remove` above are the Stage 1 mock
   * media library and are unchanged; existing callers (e.g.
   * features/media/media-library-view.tsx) keep working exactly as before
   * whether this method exists or not. Optional because MockApiAdapter does
   * not implement it — only HttpApiAdapter does.
   */
  uploadObject?(input: { file: File; module: string; entityId: string; purpose: string }): Promise<MediaObjectDto>;
  /**
   * Real R2 listing (the Telegram composer's "Обрати з медіатеки" picker is
   * its first caller) — separate from `list()` above, which stays the
   * Stage 1 mock media-library shape untouched. `module` narrows to one
   * upload module (e.g. `"telegram"`); omitted, lists everything.
   */
  listObjects?(input?: { module?: string; cursor?: string }): Promise<{ items: MediaObjectDto[]; cursor: string | null }>;
}

export interface ChurchInfoApi {
  get(): Promise<ChurchInfo>;
  update(values: ChurchInfoFormValues): Promise<ChurchInfo>;
}

export interface OrdersApi {
  list(query?: OrderQuery): Promise<PaginatedResult<Order>>;
  get(id: string): Promise<Order>;
  updateStatus(id: string, values: OrderUpdateFormValues): Promise<Order>;
  markRead(id: string, isRead: boolean): Promise<Order>;
}

/** Hand-written rather than `CrudResource` — no `remove`, and `publish` has
 * no equivalent in the translatable-content shape every other module uses. */
export interface TelegramApi {
  getStatus(): Promise<TelegramDashboardStatus>;
  listUsers(): Promise<TelegramUser[]>;
  listChats(): Promise<TelegramChat[]>;
  getToday(): Promise<TelegramTodayContent>;
  posts: {
    list(): Promise<TelegramPost[]>;
    get(id: string): Promise<TelegramPost>;
    create(values: TelegramPostFormValues): Promise<TelegramPost>;
    update(id: string, values: TelegramPostFormValues): Promise<TelegramPost>;
    publish(id: string): Promise<TelegramPost>;
  };
  autopost: {
    getSettings(): Promise<TelegramAutopostSettings>;
    updateSettings(values: AutopostSettingsFormValues): Promise<TelegramAutopostSettings>;
  };
  /** Content Plan year calendar + per-slot preparation actions -- see
   * features/telegram/content-plan/. `get`/`getDay` are read-only; every
   * other method is a Stage 2 write action addressed by (date, contentType)
   * rather than a numeric post id, since a slot may not have a
   * telegram_posts row yet (some actions create it, per their own doc). */
  contentPlan: {
    get(query?: ContentPlanQuery): Promise<ContentPlanReport>;
    getDay(date: string): Promise<ContentPlanDay>;
    /** Refuses to overwrite existing text -- use regenerateText for that. */
    generateText(date: string, contentType: AutopostContentType): Promise<TelegramPost>;
    /** Always overwrites; demotes a ready slot back to draft. */
    regenerateText(date: string, contentType: AutopostContentType): Promise<TelegramPost>;
    /** Manual edit -- no AI involved, creates the row if none exists yet. */
    editText(date: string, contentType: AutopostContentType, text: string): Promise<TelegramPost>;
    /** Refuses to overwrite an existing image -- use regenerateImage. */
    generateImage(date: string, contentType: AutopostContentType): Promise<TelegramPost>;
    /** Always attempts a fresh image; the previous one is restored if
     * generation fails (never left blank). */
    regenerateImage(date: string, contentType: AutopostContentType): Promise<TelegramPost>;
    /** "Обрати з медіатеки" -- persists an already-uploaded R2 URL directly. */
    assignImage(date: string, contentType: AutopostContentType, mediaUrl: string): Promise<TelegramPost>;
    /** draft -> ready, only if the slot passes the same validation the
     * autopost tick itself relies on before sending. */
    markReady(date: string, contentType: AutopostContentType): Promise<TelegramPost>;
    /** ready -> draft. */
    markUnready(date: string, contentType: AutopostContentType): Promise<TelegramPost>;
  };
}

/**
 * The single seam between UI/feature code and data access. Stage 1 is
 * satisfied by MockApiAdapter; Stage 2 introduces HttpApiAdapter behind the
 * same interface so no feature code changes when switching adapters.
 */
export interface ApiClient {
  auth: AuthApi;
  media: MediaApi;
  churchInfo: ChurchInfoApi;
  orders: OrdersApi;
  dashboard: {
    getStats(): Promise<DashboardStats>;
  };
  calendarDays: CrudResource<CalendarDay, CalendarDayFormValues, CalendarQuery>;
  icons: CrudResource<Icon, IconFormValues, TranslatableQuery>;
  prayers: CrudResource<Prayer, PrayerFormValues, TranslatableQuery>;
  saints: CrudResource<Saint, SaintFormValues, TranslatableQuery>;
  gospelReadings: CrudResource<GospelReading, GospelReadingFormValues, TranslatableQuery>;
  articles: CrudResource<Article, ArticleFormValues, TranslatableQuery>;
  alphabetLetters: CrudResource<AlphabetLetter, AlphabetLetterFormValues, TranslatableQuery> & {
    /** Reorders whole translation groups at once (order applies across uk/ru/en together). */
    reorderGroups(orderedGroupIds: string[]): Promise<void>;
  };
  categories: CrudResource<ProductCategory, ProductCategoryFormValues>;
  products: CrudResource<Product, ProductFormValues, ProductQuery>;
  telegram: TelegramApi;
}
