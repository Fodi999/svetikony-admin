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
import type { ListQuery, MediaObjectDto, PaginatedResult } from "@/types/api";
import type {
  AlphabetLetter,
  Article,
  AuthUser,
  CalendarDay,
  ChurchInfo,
  GospelReading,
  Icon,
  MediaAsset,
  Order,
  OrderStatus,
  Prayer,
  Product,
  ProductCategory,
  Saint,
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
}
