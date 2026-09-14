import { useState } from "react";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import type { CalendarDay, GospelReading, Language, Prayer } from "@/types/entities";
import { validateCalendarDayLinks, type LinkIssue } from "./calendar-day-status";

export interface PreparationStep {
  key: "content" | "prayer" | "gospel" | "translations" | "links";
  label: string;
  detail: string;
  /** Whether "Створити чернетки" would actually do anything for this step
   * -- false means already satisfied, unresolvable, or (links) purely
   * informational. Never invents a prayer/gospel/translation: a `false`
   * "prayer"/"gospel" step with nothing found is left for the admin to
   * handle manually in the Links tab, exactly like every prior phase of
   * this project's prayer/Gospel work. */
  willAct: boolean;
}

export interface PreparationPlan {
  steps: PreparationStep[];
  /** Only set for the "prayer" step when a real, existing candidate was
   * found -- carried so execute() links the SAME record analyze() showed,
   * never a re-derived or invented one. */
  prayerCandidate?: Prayer;
}

interface UseCalendarDayPreparationParams {
  day: CalendarDay | undefined;
  completenessPercent: number;
  hasPrayer: boolean;
  hasGospel: boolean;
  prayerCandidates: Prayer[];
  gospelCandidates: GospelReading[];
  saintLanguages: string[];
  language: string;
  missingLanguages: Language[];
  onFillContent: () => void;
  onLinkPrayer: (prayer: Prayer) => Promise<unknown>;
  onPrepareGospel: () => Promise<unknown>;
  onFillTranslations: () => Promise<unknown>;
}

/**
 * "Підготувати день з AI" (task sections 6-7): analyze() builds a plan
 * WITHOUT writing anything (two read-only calls -- recommendPrayer,
 * previewGospelReading -- both already safe/no-op elsewhere in this
 * admin), the admin reviews it, and only "Створити чернетки" fires the
 * actual writes. Every write step reuses an action that already exists
 * and is already tested elsewhere (prayer linking, Gospel preparation,
 * prepareCalendarLanguages, fillMissing) -- this hook only sequences them
 * and never talks to an AI model or the backend directly itself, aside
 * from the two read-only preview calls above.
 */
export function useCalendarDayPreparation(params: UseCalendarDayPreparationParams) {
  const [plan, setPlan] = useState<PreparationPlan | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [executing, setExecuting] = useState(false);

  async function analyze() {
    if (!params.day) return;
    setAnalyzing(true);
    try {
      const steps: PreparationStep[] = [];

      steps.push(
        params.completenessPercent === 100
          ? { key: "content", label: "Основний контент", detail: "Усе вже заповнено.", willAct: false }
          : { key: "content", label: "Основний контент", detail: "Опис, історія, фото, SEO -- буде заповнено лише відсутнє.", willAct: true },
      );

      let prayerCandidate: Prayer | undefined;
      if (params.hasPrayer) {
        steps.push({ key: "prayer", label: "Молитва", detail: "Вже пов'язано.", willAct: false });
      } else {
        try {
          const result = await apiClient.calendarDays.recommendPrayer(params.day.id);
          prayerCandidate = result.prayerId ? params.prayerCandidates.find((p) => p.id === result.prayerId) : undefined;
          steps.push(
            prayerCandidate
              ? { key: "prayer", label: "Молитва", detail: `Існуюча молитва: ${prayerCandidate.title}`, willAct: true }
              : { key: "prayer", label: "Молитва", detail: "Не знайдено відповідної -- створіть вручну у вкладці «Зв'язки».", willAct: false },
          );
        } catch {
          steps.push({ key: "prayer", label: "Молитва", detail: "Не вдалося підібрати молитву зараз.", willAct: false });
        }
      }

      if (params.hasGospel) {
        steps.push({ key: "gospel", label: "Євангеліє", detail: "Вже пов'язано.", willAct: false });
      } else {
        try {
          const preview = await apiClient.calendarDays.previewGospelReading(params.day.id);
          steps.push({ key: "gospel", label: "Євангеліє", detail: `${preview.reference} · Джерело: OCA`, willAct: true });
        } catch {
          steps.push({ key: "gospel", label: "Євангеліє", detail: "⚠ Канонічне читання не визначено.", willAct: false });
        }
      }

      steps.push(
        params.missingLanguages.length
          ? { key: "translations", label: "Переклади", detail: `Буде створено: ${params.missingLanguages.map((l) => l.toUpperCase()).join(", ")}.`, willAct: true }
          : { key: "translations", label: "Переклади", detail: "UK/RU/EN уже мають запис.", willAct: false },
      );

      const linkIssues: LinkIssue[] = validateCalendarDayLinks({
        language: params.language,
        prayers: params.hasPrayer ? [{ id: "linked", language: params.language }] : [],
        gospel: params.hasGospel ? [{ id: "linked", language: params.language }] : [],
        saints: params.saintLanguages.map((lang) => ({ id: "linked", language: lang })),
      });
      steps.push({
        key: "links",
        label: "Внутрішні зв'язки",
        detail: linkIssues.length ? linkIssues.map((issue) => issue.message).join(" ") : "Проблем не знайдено.",
        willAct: false,
      });

      setPlan({ steps, prayerCandidate });
    } finally {
      setAnalyzing(false);
    }
  }

  async function execute() {
    if (!plan) return;
    setExecuting(true);
    try {
      const failures: string[] = [];
      for (const step of plan.steps) {
        if (!step.willAct) continue;
        try {
          if (step.key === "content") params.onFillContent();
          else if (step.key === "prayer" && plan.prayerCandidate) await params.onLinkPrayer(plan.prayerCandidate);
          else if (step.key === "gospel") await params.onPrepareGospel();
          else if (step.key === "translations") await params.onFillTranslations();
        } catch (error) {
          failures.push(`${step.label}: ${errorMessageFor(error)}`);
        }
      }
      setPlan(null);
      return failures;
    } finally {
      setExecuting(false);
    }
  }

  function cancel() {
    setPlan(null);
  }

  return { plan, analyzing, executing, analyze, execute, cancel };
}
