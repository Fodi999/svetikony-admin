import type { ApiClient } from "@/lib/api/client";
import { alphabetLettersResource } from "@/lib/api/mock/alphabet";
import { articlesResource } from "@/lib/api/mock/articles";
import { authResource } from "@/lib/api/mock/auth";
import { calendarDaysResource } from "@/lib/api/mock/calendar";
import { categoriesResource } from "@/lib/api/mock/categories";
import { churchInfoResource } from "@/lib/api/mock/church-info";
import { dashboardResource } from "@/lib/api/mock/dashboard";
import { gospelReadingsResource } from "@/lib/api/mock/gospel";
import { iconsResource } from "@/lib/api/mock/icons";
import { mediaResource } from "@/lib/api/mock/media";
import { ordersResource } from "@/lib/api/mock/orders";
import { prayersResource } from "@/lib/api/mock/prayers";
import { productsResource } from "@/lib/api/mock/products";
import { saintsResource } from "@/lib/api/mock/saints";

/**
 * Stage-1 implementation of ApiClient: everything is in-memory, seeded from
 * lib/mock-data, and never touches the network. Stage 2 introduces
 * HttpApiAdapter implementing the exact same ApiClient interface so feature
 * code never has to change when switching adapters.
 */
export const mockApiAdapter: ApiClient = {
  auth: authResource,
  media: mediaResource,
  churchInfo: churchInfoResource,
  orders: ordersResource,
  dashboard: dashboardResource,
  calendarDays: calendarDaysResource,
  icons: iconsResource,
  prayers: prayersResource,
  saints: saintsResource,
  gospelReadings: gospelReadingsResource,
  articles: articlesResource,
  alphabetLetters: alphabetLettersResource,
  categories: categoriesResource,
  products: productsResource,
};
