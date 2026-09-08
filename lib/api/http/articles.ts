import type { z } from "zod";
import type { BffArticleDto, WorkerArticleWritePayload } from "@/app/api/bff/articles/_contract";
import type { ApiClient, TranslatableQuery } from "@/lib/api/client";
import { BFF_ENDPOINTS } from "@/lib/api/endpoints";
import { createHttpListResource } from "@/lib/api/http/resource-factory";
import { httpDelete, httpPost, httpPut } from "@/lib/api/http/transport";
import { contentStatusSchema, languageSchema } from "@/lib/validation/common";
import type { ArticleFormValues } from "@/lib/validation/article.schema";
import type { ContentStatus, Language, Article } from "@/types/entities";

/** Same defensive pattern as Calendar Day/Prayers/Icons/Saints: fall back
 * rather than an unchecked cast if the Worker's value doesn't match the
 * admin's enum. */
function safeEnum<T extends string>(schema: z.ZodType<T>, value: string, fallback: T): T {
  const result = schema.safeParse(value);
  return result.success ? result.data : fallback;
}

/**
 * BFF DTO -> admin entity mapping.
 *
 * PHASE MULTILINGUAL-4: `translationGroupId` now comes straight from the
 * Worker (a real, auto-linked-by-slug value, same as Icons/Prayers/Saints)
 * — church_articles gained a real `translation_group_id` column in
 * migration 0017 (svet-ikony), so this is no longer a synthesized
 * placeholder. Article extends Translatable now, so the
 * TranslationSwitcher pattern works here too — see articlesHttpResource's
 * new createTranslation below.
 *
 * `iconId` maps straight through as a single relation — church_articles
 * really does have this column, and the admin form now edits it as a
 * single select (see toPayload below), not the plural relatedIconIds
 * picker the mock/UI used to expose. There is no relatedSaintIds mapping
 * here: church_articles has no saint-relation column of any kind, so that
 * field was removed from the Article type/form entirely rather than kept
 * as a UI control whose value silently never persists — see the Phase
 * 2B-2 report's ARTICLE FIELD CONTRACT section.
 */
function toEntity(dto: BffArticleDto): Article {
  return {
    id: dto.id,
    translationGroupId: dto.translationGroupId,
    language: safeEnum<Language>(languageSchema, dto.language, "uk"),
    title: dto.title,
    slug: dto.slug,
    content: dto.content,
    seoTitle: dto.seoTitle || undefined,
    seoDescription: dto.seoDescription || undefined,
    status: safeEnum<ContentStatus>(contentStatusSchema, dto.status, "draft"),
    iconId: dto.iconId ?? undefined,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

/** Admin form -> Worker write payload. Every field the form edits has a
 * real column to write to (see _contract.ts's doc comment) — nothing is
 * silently dropped here, unlike Saints' toPayload. */
function toPayload(values: ArticleFormValues): WorkerArticleWritePayload {
  return {
    title: values.title,
    slug: values.slug,
    language: values.language,
    content: values.content,
    seoTitle: values.seoTitle ?? "",
    seoDescription: values.seoDescription ?? "",
    status: values.status,
    iconId: values.iconId || null,
  };
}

const baseResource = createHttpListResource<BffArticleDto, Article, TranslatableQuery>({
  listPath: BFF_ENDPOINTS.articles,
  itemPath: (id) => `${BFF_ENDPOINTS.articles}/${encodeURIComponent(id)}`,
  toEntity,
  filter: (article, query) => (!query?.status || article.status === query.status) && (!query?.language || article.language === query.language),
  searchFields: (article) => [article.title, article.slug],
  sort: (a, b) => a.title.localeCompare(b.title),
});

export const articlesHttpResource: ApiClient["articles"] = {
  ...baseResource,
  async create(values: ArticleFormValues): Promise<Article> {
    const dto = await httpPost<BffArticleDto>(BFF_ENDPOINTS.articles, toPayload(values));
    return toEntity(dto);
  },
  async update(id: string, values: ArticleFormValues): Promise<Article> {
    const dto = await httpPut<BffArticleDto>(`${BFF_ENDPOINTS.articles}/${encodeURIComponent(id)}`, toPayload(values));
    return toEntity(dto);
  },
  async remove(id: string): Promise<void> {
    await httpDelete(`${BFF_ENDPOINTS.articles}/${encodeURIComponent(id)}`);
  },
  /** PHASE MULTILINGUAL-4: the Worker has no explicit "join this
   * translation group" input, same as Icons/Gospel/Prayers/Saints -- it
   * auto-links by matching `slug` at insert time (articles.ts's COALESCE),
   * so a new translation is just a plain create with the same slug and a
   * different language; `groupId` isn't needed by the Worker call itself,
   * only by the caller (articles/new/page.tsx) to know it's in "add
   * translation" mode. Articles still require an explicit slug (no
   * slugify-from-title fallback server-side), so the caller must carry the
   * sibling's own slug forward — same as every other module's "new" page. */
  async createTranslation(_groupId: string, language: string, values: ArticleFormValues): Promise<Article> {
    const dto = await httpPost<BffArticleDto>(BFF_ENDPOINTS.articles, toPayload({ ...values, language: language as ArticleFormValues["language"] }));
    return toEntity(dto);
  },
};
