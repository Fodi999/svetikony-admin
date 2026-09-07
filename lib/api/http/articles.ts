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
 * `translationGroupId` is synthesized as the article's own id:
 * church_articles has no translation_group_id column at all (unlike
 * icons/saints/prayers/calendar, all of which do) — verified directly
 * against the migration and repository, not assumed. No Articles UI
 * anywhere reads or displays this field (grepped directly across
 * features/articles/**), so representing each article as its own
 * singleton group is an honest placeholder for "no real grouping exists"
 * rather than a claim that any two articles are actually linked as
 * translations of each other. `createTranslation` is deliberately NOT
 * implemented below for the same reason (see articlesHttpResource) — it
 * inherits the shared factory's not-implemented default instead of faking
 * a group join.
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
    translationGroupId: dto.id,
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
  // createTranslation intentionally left as the shared factory's default
  // (throws a controlled not_implemented error): church_articles has no
  // translation_group_id and no slug-based auto-join precedent (its own
  // repository comment notes articles require an explicit slug, unlike
  // saints/gospel/prayers' slugify-from-title fallback), and no Articles
  // UI anywhere calls this today (grepped directly) — failing loudly is
  // correct if it's ever wired to a UI later, rather than faking a group.
};
