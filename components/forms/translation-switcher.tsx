"use client";

import { Check, CircleDashed, CircleSlash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Language } from "@/types/entities";

export type Completeness = "done" | "partial" | "empty";

const LANGUAGE_LABEL: Record<Language, string> = { uk: "UK", ru: "RU", en: "EN" };

const COMPLETENESS_ICON: Record<Completeness, typeof Check> = {
  done: Check,
  partial: CircleDashed,
  empty: CircleSlash2,
};

const COMPLETENESS_LABEL: Record<Completeness, string> = {
  done: "готово",
  partial: "частково",
  empty: "порожньо",
};

const COMPLETENESS_CLASS: Record<Completeness, string> = {
  done: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  partial: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  empty: "border-border bg-muted text-muted-foreground",
};

interface TranslationSwitcherProps {
  active: Language;
  onSelect: (language: Language) => void;
  completeness: Record<Language, Completeness>;
}

export function TranslationSwitcher({ active, onSelect, completeness }: TranslationSwitcherProps) {
  return (
    <div role="tablist" aria-label="Мова перекладу" className="flex gap-2">
      {(Object.keys(LANGUAGE_LABEL) as Language[]).map((language) => {
        const state = completeness[language];
        const Icon = COMPLETENESS_ICON[state];
        const isActive = active === language;
        return (
          <button
            key={language}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(language)}
            title={`${LANGUAGE_LABEL[language]} — ${COMPLETENESS_LABEL[state]}`}
            className={cn(
              "flex min-h-11 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors",
              COMPLETENESS_CLASS[state],
              isActive && "ring-2 ring-ring ring-offset-2 ring-offset-background",
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {LANGUAGE_LABEL[language]}
            <span className="sr-only">{COMPLETENESS_LABEL[state]}</span>
          </button>
        );
      })}
    </div>
  );
}
