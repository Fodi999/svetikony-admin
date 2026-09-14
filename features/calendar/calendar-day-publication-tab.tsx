"use client";

import type { Control } from "react-hook-form";
import { SelectField } from "@/components/forms/select-field";
import { Button } from "@/components/ui/button";
import { messages } from "@/lib/i18n";
import type { CalendarDayFormValues } from "@/lib/validation/calendar.schema";
import type { ReadinessItem } from "./calendar-day-status";

function itemIcon(state: ReadinessItem["state"]): string {
  return state === "ready" ? "✓" : state === "partial" ? "◐" : state === "n/a" ? "·" : "!";
}

interface CalendarDayPublicationTabProps {
  control: Control<CalendarDayFormValues>;
  mode: "create" | "edit";
  readiness: ReadinessItem[];
  onDelete?: () => void;
}

/** Publication tab as the final verification screen (task section 18): a
 * read-only checklist built from the same deterministic
 * calendarDayReadiness() the header already uses -- nothing new computed
 * here. The actual publish guard (requestPublish, the incomplete-publish
 * confirm dialog) stays in the parent form; this tab only explains what
 * it would warn about. */
export function CalendarDayPublicationTab({ control, mode, readiness, onDelete }: CalendarDayPublicationTabProps) {
  return (
    <div className="space-y-4">
      <SelectField
        control={control}
        name="status"
        label="Статус"
        options={[
          { value: "draft", label: messages.status.draft },
          { value: "published", label: messages.status.published },
          { value: "archived", label: messages.status.archived },
        ]}
      />

      <div className="space-y-1.5">
        <p className="text-sm font-medium">Перевірка перед публікацією</p>
        <ul className="space-y-1 text-sm">
          {readiness
            .filter((item) => item.state !== "n/a")
            .map((item) => (
              <li key={item.key} className={item.state === "ready" ? "text-emerald-600 dark:text-emerald-400" : item.state === "partial" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}>
                {itemIcon(item.state)} {item.label}
              </li>
            ))}
        </ul>
      </div>

      {mode === "edit" && onDelete ? (
        <Button type="button" variant="destructive" onClick={onDelete}>
          {messages.actions.delete} день
        </Button>
      ) : null}
    </div>
  );
}
