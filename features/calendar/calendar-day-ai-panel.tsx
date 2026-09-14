"use client";

import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ReadinessItem } from "./calendar-day-status";
import type { PreparationPlan } from "./use-calendar-day-preparation";

function stateIcon(state: ReadinessItem["state"]): string {
  return state === "ready" ? "✓" : state === "partial" ? "◐" : state === "n/a" ? "" : "!";
}

interface CalendarDayAiPanelProps {
  statusRow: ReadinessItem[];
  plan: PreparationPlan | null;
  analyzing: boolean;
  executing: boolean;
  onAnalyze: () => void;
  onConfirm: () => Promise<string[] | undefined>;
  onCancel: () => void;
}

/**
 * The ONE main AI action (task section 21) -- everything else in this
 * editor is a smaller, contextual action inside its own section. Clicking
 * the button only ANALYZES (task section 7): nothing is written until the
 * admin reviews the plan and clicks "Створити чернетки" in the dialog.
 */
export function CalendarDayAiPanel({ statusRow, plan, analyzing, executing, onAnalyze, onConfirm, onCancel }: CalendarDayAiPanelProps) {
  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="font-medium">Підготувати день з AI</p>
            <p className="text-sm text-muted-foreground">
              Astra проаналізує день, знайде або створить відсутній контент (молитву, читання, фото), підготує переклади,
              SEO та перевірить внутрішні зв&apos;язки.
            </p>
          </div>
        </div>
        <Button type="button" disabled={analyzing} onClick={onAnalyze}>
          <Sparkles className="size-4" />
          {analyzing ? "Аналізуємо…" : "Підготувати день з AI"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {statusRow.map((item) => (
          <span key={item.key} className={item.state === "ready" ? "text-emerald-600 dark:text-emerald-400" : item.state === "missing" ? "text-muted-foreground" : "text-amber-600 dark:text-amber-400"}>
            {stateIcon(item.state)} {item.label}
          </span>
        ))}
      </div>

      <Dialog open={plan !== null} onOpenChange={(open) => (!open ? onCancel() : undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Підготовка дня</DialogTitle>
          </DialogHeader>
          <ul className="space-y-2 text-sm">
            {plan?.steps.map((step) => (
              <li key={step.key}>
                <span className="font-medium">{step.label}</span>
                <p className={step.willAct ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
                  {step.willAct ? "+ " : ""}
                  {step.detail}
                </p>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} disabled={executing}>
              Скасувати
            </Button>
            <Button
              type="button"
              disabled={executing || !plan?.steps.some((step) => step.willAct)}
              onClick={async () => {
                const failures = await onConfirm();
                if (failures?.length) {
                  toast.error(`Не все вдалося: ${failures.join("; ")}`);
                } else {
                  toast.success("Чернетки створено. Перевірте поля перед публікацією.");
                }
              }}
            >
              {executing ? "Створюємо…" : "Створити чернетки"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
