"use client";

import { Check, Circle, CircleDashed } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ReadinessItem, ReadinessState } from "./calendar-day-status";

interface EntityRef {
  id: string;
  label: string;
  hrefBase: string;
  detail?: string;
}

interface CalendarDayContentStatusProps {
  readiness: ReadinessItem[];
  saint?: EntityRef;
  prayer?: EntityRef;
  gospel?: EntityRef;
  icon?: EntityRef;
  translations: { key: string; label: string; state: ReadinessState }[];
  onGoToTab: (tab: string) => void;
}

function StateIcon({ state }: { state: ReadinessState }) {
  if (state === "ready") return <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden />;
  if (state === "partial") return <Circle className="size-3.5 text-amber-500" aria-hidden />;
  return <CircleDashed className="size-3.5 text-muted-foreground" aria-hidden />;
}

function stateLabel(state: ReadinessState): string {
  return state === "ready" ? "Заповнено" : state === "partial" ? "Частково" : "Потрібна";
}

/** Compact "Статус контенту" status-card grid (task section 11) -- a
 * dashboard, not a form: each card shows current state + a small
 * navigation action, never an inline editor. Driven entirely by data the
 * form already has loaded (readiness items + already-fetched relation
 * lookups); computes nothing new itself. */
export function CalendarDayContentStatus({ readiness, saint, prayer, gospel, icon, translations, onGoToTab }: CalendarDayContentStatusProps) {
  const byKey = (key: string) => readiness.find((item) => item.key === key)?.state ?? "missing";

  const entityCard = (label: string, ref: EntityRef | undefined, state: ReadinessState, tab: string) => (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          <span className="flex items-center gap-1.5">
            <StateIcon state={state} />
            {label}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {ref ? (
          <>
            <p className="truncate text-muted-foreground">{ref.label}</p>
            {ref.detail ? <p className="text-xs text-muted-foreground">{ref.detail}</p> : null}
            <Button type="button" variant="ghost" size="sm" nativeButton={false} render={<Link href={`${ref.hrefBase}/${ref.id}`} />}>
              Відкрити
            </Button>
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">{stateLabel(state)}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => onGoToTab(tab)}>
              Перейти
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {entityCard("Святий", saint, byKey("saint"), "relations")}
      {entityCard("Молитва", prayer, byKey("prayer"), "relations")}
      {entityCard("Євангеліє", gospel, byKey("gospel"), "relations")}
      {entityCard("Ікона", icon, icon ? "ready" : "missing", "relations")}

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Переклади</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex flex-wrap gap-2 text-xs">
            {translations.map((translation) => (
              <span key={translation.key} className="inline-flex items-center gap-1">
                <StateIcon state={translation.state} />
                {translation.label}
              </span>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => onGoToTab("translations")}>
            Перейти
          </Button>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className={cn("flex items-center gap-1.5 text-sm font-medium")}>
            <StateIcon state={byKey("seo")} />
            SEO
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-xs text-muted-foreground">{stateLabel(byKey("seo"))}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => onGoToTab("seo")}>
            Перейти
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
