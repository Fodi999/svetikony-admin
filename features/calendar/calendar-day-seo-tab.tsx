"use client";

import { Sparkles } from "lucide-react";
import type { Control } from "react-hook-form";
import { TextField } from "@/components/forms/text-field";
import { Button } from "@/components/ui/button";
import type { CalendarDayFormValues } from "@/lib/validation/calendar.schema";

interface CalendarDaySeoTabProps {
  control: Control<CalendarDayFormValues>;
  mode: "create" | "edit";
  hasDay: boolean;
  seoTitle: string | null | undefined;
  seoDescription: string | null | undefined;
  generatePending: boolean;
  onGenerate: () => void;
  onRequestRegenerate: () => void;
}

/** Dedicated "SEO" tab (task section 17), extracted unchanged from the
 * former Content tab's SEO block -- same fields, same generate/regenerate
 * AI actions, same character counters. */
export function CalendarDaySeoTab({ control, mode, hasDay, seoTitle, seoDescription, generatePending, onGenerate, onRequestRegenerate }: CalendarDaySeoTabProps) {
  const bothFilled = Boolean(seoTitle?.trim() && seoDescription?.trim());
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <TextField control={control} name="seoTitle" label="SEO title" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{seoTitle?.length ?? 0}/70 символів</span>
        </div>
      </div>
      <div className="space-y-1">
        <TextField control={control} name="seoDescription" label="SEO description" textarea rows={3} />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{seoDescription?.length ?? 0}/200 символів</span>
          {mode === "edit" && hasDay ? (
            <div className="flex gap-2">
              {!bothFilled ? (
                <Button type="button" size="sm" variant="ghost" disabled={generatePending} onClick={onGenerate}>
                  <Sparkles className="size-3.5" />
                  {generatePending ? "Генерація…" : "Згенерувати SEO"}
                </Button>
              ) : (
                <Button type="button" size="sm" variant="ghost" disabled={generatePending} onClick={onRequestRegenerate}>
                  <Sparkles className="size-3.5" />
                  {generatePending ? "Регенерація…" : "Перегенерувати SEO"}
                </Button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
