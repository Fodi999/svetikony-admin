"use client";

import { useIsMutating, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import { AUTOPOST_CONTENT_TYPES, AUTOPOST_CONTENT_TYPE_LABELS, type PrepareDayReport } from "@/types/entities";

function ResultLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

/**
 * "Підготувати весь день" -- the Day Drawer's primary action. Orchestrates
 * only (see svet-ikony's prepareContentPlanDay()): fills missing text/
 * images for available slots, never touches sent/sending/ready slots or
 * content that already exists, never marks anything ready, never sends
 * Telegram. Confirming, running, and the resulting per-outcome summary all
 * live in this one component so DayDrawer itself stays a plain layout.
 */
export function PrepareDayPanel({ civilDate, year }: { civilDate: string; year: number }) {
  const queryClient = useQueryClient();
  const dayKey = ["telegram-preparation", civilDate];
  const dayBusy = useIsMutating({ mutationKey: dayKey }) > 0;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [progress, setProgress] = useState("");
  const [lastResult, setLastResult] = useState<PrepareDayReport | null>(null);

  const mutation = useMutation({
    mutationKey: dayKey,
    mutationFn: async () => {
      setLastResult(null);
      let combined: PrepareDayReport | null = null;
      for (const [index, contentType] of AUTOPOST_CONTENT_TYPES.entries()) {
        setProgress(`${index + 1}/${AUTOPOST_CONTENT_TYPES.length} · ${AUTOPOST_CONTENT_TYPE_LABELS[contentType]}`);
        const report = await apiClient.telegram.contentPlan.prepareDay(civilDate, contentType);
        if (!combined) combined = report;
        else {
          const previous: PrepareDayReport = combined;
          combined = { ...previous, results: [...previous.results, ...report.results] };
          for (const key of ["total", "prepared", "alreadyPrepared", "skippedReady", "skippedSent", "skippedSending", "missingSource", "reviewRequired", "imageFailed", "failed"] as const) combined![key] = previous[key] + report[key];
        }
        setLastResult(combined);
        await queryClient.invalidateQueries({ queryKey: ["telegram", "contentPlan", "day", civilDate] });
      }
      return combined!;
    },
    onSuccess: (report) => {
      setLastResult(report);
      queryClient.invalidateQueries({ queryKey: ["telegram", "contentPlan", year] });
      queryClient.invalidateQueries({ queryKey: ["telegram", "contentPlan", "day", civilDate] });
      toast.success(report.failed + report.imageFailed > 0 ? "День підготовлено частково — перевірте помилки нижче" : "Підготовку завершено");
    },
    onError: (error) => toast.error(errorMessageFor(error)),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["telegram", "contentPlan", year] });
      queryClient.invalidateQueries({ queryKey: ["telegram", "contentPlan", "day", civilDate] });
    },
  });

  return (
    <div className="space-y-2" aria-busy={mutation.isPending}>
      <Button
        className="w-full"
        disabled={dayBusy}
        onClick={() => setConfirmOpen(true)}
      >
        {mutation.isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Підготовка контенту…
          </>
        ) : (
          "Підготувати весь день"
        )}
      </Button>

      {mutation.isPending ? <p role="status" className="text-sm text-muted-foreground">{progress}. Послідовно готуємо текст і фото. Це може зайняти кілька хвилин. Не запускайте підготовку повторно.</p> : null}
      {mutation.isError ? <p role="alert" className="text-sm text-destructive">Не вдалося завершити запит. Оновіть день і перевірте вже підготовлені матеріали перед повторною спробою.</p> : null}
      {lastResult ? (
        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <p className="mb-2 font-medium">{mutation.isPending ? "Поточний результат" : mutation.isError ? "Частковий результат" : "Підготовку завершено"}</p>
          <div className="space-y-1">
            <ResultLine label="Підготовлено" value={lastResult.prepared} />
            <ResultLine label="Вже готово" value={lastResult.alreadyPrepared} />
            <ResultLine label="Без джерела" value={lastResult.missingSource} />
            <ResultLine label="Потребують перевірки" value={lastResult.reviewRequired} />
            <ResultLine label="Помилки" value={lastResult.failed + lastResult.imageFailed} />
          </div>
          <ul className="mt-3 space-y-1" aria-label="Результати публікацій">
            {lastResult.results.filter(item => ["failed", "image_failed", "missing_source", "review_required"].includes(item.result)).map(item => (
              <li key={item.contentType}>
                {AUTOPOST_CONTENT_TYPE_LABELS[item.contentType]}: {item.result === "image_failed" ? "текст збережено, фото не підготовлено" : item.result === "missing_source" ? "немає джерела" : item.result === "review_required" ? "перевірте джерело" : "підготовку не завершено"}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">Мова каналу: українська. Підготовка не надсилає пости; готовність до відправлення підтверджується окремо.</p>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Підготувати весь день?"
        description="Система підготує відсутній текст і зображення для доступних публікацій цього дня. Готові та вже опубліковані матеріали не будуть змінені. Публікації без перевіреного джерела будуть пропущені. Telegram-публікації не надсилатимуться."
        confirmLabel="Підготувати"
        onConfirm={() => {
          setConfirmOpen(false);
          mutation.mutate();
        }}
      />
    </div>
  );
}
