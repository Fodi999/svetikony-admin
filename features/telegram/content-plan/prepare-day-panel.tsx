"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import type { PrepareDayReport } from "@/types/entities";

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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lastResult, setLastResult] = useState<PrepareDayReport | null>(null);

  const mutation = useMutation({
    mutationFn: () => apiClient.telegram.contentPlan.prepareDay(civilDate),
    onSuccess: (report) => {
      setLastResult(report);
      queryClient.invalidateQueries({ queryKey: ["telegram", "contentPlan", year] });
      queryClient.invalidateQueries({ queryKey: ["telegram", "contentPlan", "day", civilDate] });
      toast.success("Підготовку завершено");
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });

  return (
    <div className="space-y-2">
      <Button
        className="w-full"
        disabled={mutation.isPending}
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

      {lastResult ? (
        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <p className="mb-2 font-medium">Підготовку завершено</p>
          <div className="space-y-1">
            <ResultLine label="Підготовлено" value={lastResult.prepared} />
            <ResultLine label="Вже готово" value={lastResult.alreadyPrepared} />
            <ResultLine label="Без джерела" value={lastResult.missingSource} />
            <ResultLine label="Потребують перевірки" value={lastResult.reviewRequired} />
            <ResultLine label="Помилки" value={lastResult.failed + lastResult.imageFailed} />
          </div>
        </div>
      ) : null}

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
