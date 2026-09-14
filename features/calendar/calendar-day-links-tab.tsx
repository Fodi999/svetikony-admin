"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { GospelReading, Prayer } from "@/types/entities";
import type { LinkIssue } from "./calendar-day-status";

/** Read-only reverse-lookup row for the "Зв'язки" tab -- see the doc
 * comment above `linkedIcons` etc. (calendar-day-form.tsx) for why this is
 * never an editable picker. */
export function LinkedContentSection({ title, hrefBase, items }: { title: string; hrefBase: string; items: { id: string; label: string }[] }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Немає пов&apos;язаних записів.</p>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id}>
              <Link href={`${hrefBase}/${item.id}`} className="text-sm text-primary underline-offset-2 hover:underline">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Same as LinkedContentSection, but for relations the admin can actually
 * unlink from here (prayer/gospel) -- section 12's "open/replace/unlink
 * where allowed". Unlinking is still a real write to the CHILD record's
 * own calendarDayId (cleared to null), same mechanism as linking. */
export function LinkedRelationList({
  title,
  hrefBase,
  items,
  onUnlink,
  unlinkPending,
}: {
  title: string;
  hrefBase: string;
  items: { id: string; label: string; status: string }[];
  onUnlink: (id: string) => void;
  unlinkPending: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Немає пов&apos;язаних записів.</p>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-2">
              <Link href={`${hrefBase}/${item.id}`} className="text-sm text-primary underline-offset-2 hover:underline">
                {item.label}
              </Link>
              <span className="text-xs text-muted-foreground">({item.status === "published" ? "опубліковано" : item.status === "draft" ? "чернетка" : item.status})</span>
              <Button type="button" variant="ghost" size="sm" disabled={unlinkPending} onClick={() => onUnlink(item.id)}>
                Відв&apos;язати
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** "Зв'язати існуючу" -- a small dropdown of not-yet-linked prayers/Gospel
 * readings, right in the calendar form, so linking one doesn't require
 * navigating away. Still a real write to the CHILD record's own
 * calendarDayId (via `onLink`), same as editing it directly would do --
 * this is a shortcut for the existing pattern, not a new one. Only offers
 * items with no calendarDayId at all; reassigning one already linked to a
 * *different* day stays a "go edit that record" action. */
export function RelationLinkExisting<T extends { id: string; calendarDayId?: string }>({
  candidates,
  getLabel,
  onLink,
  pending,
  value,
  onValueChange,
  children,
}: {
  candidates: T[];
  getLabel: (item: T) => string;
  onLink: (item: T) => void;
  pending: boolean;
  /** Controlled so an "AI підбір" action elsewhere (see recommendPrayerMutation)
   * can pre-select a suggestion into the same dropdown -- the admin still
   * has to click "Зв'язати" themselves either way. */
  value: string;
  onValueChange: (value: string) => void;
  /** Extra controls (e.g. an "AI підбір" button) rendered alongside the
   * dropdown, sharing its layout row. */
  children?: ReactNode;
}) {
  const unlinked = candidates.filter((item) => !item.calendarDayId);
  if (!unlinked.length) return null;
  const options = unlinked.map((item) => ({ value: item.id, label: getLabel(item) }));
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={value} onValueChange={(next) => onValueChange(next ?? "")} items={options}>
        <SelectTrigger className="w-full sm:w-64" aria-label="Оберіть існуючий запис">
          <SelectValue placeholder="Оберіть існуючий запис" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!value || pending}
        onClick={() => {
          const item = unlinked.find((candidate) => candidate.id === value);
          if (item) {
            onLink(item);
            onValueChange("");
          }
        }}
      >
        Зв&apos;язати
      </Button>
      {children}
    </div>
  );
}

/** "Створити нову" -- collapsed to a single button until opened, then a
 * deliberately minimal inline form (no AI authorship, no visualizer/audio
 * fields -- see handleCreatePrayer's own doc comment). */
export function QuickCreatePrayer({ onCreate, pending }: { onCreate: (values: { title: string; text: string }) => void; pending: boolean }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        + Створити нову
      </Button>
    );
  }
  return (
    <div className="space-y-2 rounded-md border p-3">
      <Input placeholder="Назва молитви" value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Назва молитви" />
      <Textarea placeholder="Текст молитви" rows={4} value={text} onChange={(event) => setText(event.target.value)} aria-label="Текст молитви" />
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => {
            onCreate({ title, text });
            setTitle("");
            setText("");
            setOpen(false);
          }}
        >
          Створити
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Скасувати
        </Button>
      </div>
    </div>
  );
}

/** Same shape as QuickCreatePrayer, for Gospel readings (reference/title/
 * text/explanation instead of title/text). */
export function QuickCreateGospel({
  onCreate,
  pending,
}: {
  onCreate: (values: { reference: string; title: string; text: string; explanation: string }) => void;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reference, setReference] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [explanation, setExplanation] = useState("");
  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        + Створити нове
      </Button>
    );
  }
  return (
    <div className="space-y-2 rounded-md border p-3">
      <Input placeholder="Посилання, напр. Ів. 1:1-17" value={reference} onChange={(event) => setReference(event.target.value)} aria-label="Посилання на читання" />
      <Input placeholder="Назва" value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Назва читання" />
      <Textarea placeholder="Текст читання" rows={4} value={text} onChange={(event) => setText(event.target.value)} aria-label="Текст читання" />
      <Textarea placeholder="Пояснення (необов'язково)" rows={2} value={explanation} onChange={(event) => setExplanation(event.target.value)} aria-label="Пояснення" />
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => {
            onCreate({ reference, title, text, explanation });
            setReference("");
            setTitle("");
            setText("");
            setExplanation("");
            setOpen(false);
          }}
        >
          Створити
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Скасувати
        </Button>
      </div>
    </div>
  );
}

interface CalendarDayLinksTabProps {
  linkedIcons: { id: string; label: string }[];
  linkedSaints: { id: string; label: string }[];
  linkedPrayers: (Prayer & { label: string })[];
  linkedGospel: (GospelReading & { label: string })[];
  prayerCandidates: Prayer[];
  gospelCandidates: GospelReading[];
  prayerLinkId: string;
  onPrayerLinkIdChange: (value: string) => void;
  gospelLinkId: string;
  onGospelLinkIdChange: (value: string) => void;
  onLinkPrayer: (prayer: Prayer) => void;
  onUnlinkPrayer: (id: string) => void;
  linkPrayerPending: boolean;
  onLinkGospel: (reading: GospelReading) => void;
  onUnlinkGospel: (id: string) => void;
  linkGospelPending: boolean;
  onCreatePrayer: (values: { title: string; text: string }) => void;
  createPrayerPending: boolean;
  onCreateGospel: (values: { reference: string; title: string; text: string; explanation: string }) => void;
  createGospelPending: boolean;
  onRecommendPrayer: () => void;
  recommendPrayerPending: boolean;
  onPrepareGospel: () => void;
  prepareGospelPending: boolean;
  linkIssues: LinkIssue[];
  onValidateLinks: () => void;
}

/** Redesigned "Зв'язки" tab (task section 12): structured Saint/Prayer/
 * Gospel/Icon sections, each with its real relation state, plus a
 * deterministic "AI перевірити зв'язки" check. All mutation wiring stays
 * in the parent CalendarDayForm -- this component is purely the tab's
 * layout and its own small, self-contained sub-components above. */
export function CalendarDayLinksTab(props: CalendarDayLinksTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Це реальні зв&apos;язки з боку пов&apos;язаних записів (їхнє поле «календарний день»). Для ікон і святих, щоб
          додати чи прибрати зв&apos;язок, відредагуйте відповідний запис. Молитви й читання можна зв&apos;язати, відв
          &apos;язати або швидко створити прямо тут.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={props.onValidateLinks}>
          <Sparkles className="size-4" />
          AI перевірити зв&apos;язки
        </Button>
      </div>

      {props.linkIssues.length ? (
        <ul className="space-y-1 rounded-md border p-3 text-sm">
          {props.linkIssues.map((issue, index) => (
            <li key={index} className={issue.severity === "warning" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}>
              {issue.message}
            </li>
          ))}
        </ul>
      ) : null}

      <LinkedContentSection title="Пов'язані ікони" hrefBase="/icons" items={props.linkedIcons} />
      <LinkedContentSection title="Пов'язані святі" hrefBase="/saints" items={props.linkedSaints} />

      <div className="space-y-2">
        <LinkedRelationList
          title="Пов'язані молитви"
          hrefBase="/prayers"
          items={props.linkedPrayers.map((p) => ({ id: p.id, label: p.label, status: p.status }))}
          onUnlink={props.onUnlinkPrayer}
          unlinkPending={props.linkPrayerPending}
        />
        <RelationLinkExisting
          candidates={props.prayerCandidates}
          getLabel={(p) => `${p.title} (${p.language.toUpperCase()})`}
          onLink={props.onLinkPrayer}
          pending={props.linkPrayerPending}
          value={props.prayerLinkId}
          onValueChange={props.onPrayerLinkIdChange}
        >
          <Button type="button" variant="ghost" size="sm" disabled={props.recommendPrayerPending} onClick={props.onRecommendPrayer}>
            <Sparkles className="size-4" />
            {props.recommendPrayerPending ? "Підбираємо…" : "AI підбір"}
          </Button>
        </RelationLinkExisting>
        <QuickCreatePrayer onCreate={props.onCreatePrayer} pending={props.createPrayerPending} />
      </div>

      <div className="space-y-2">
        <LinkedRelationList
          title="Пов'язані читання"
          hrefBase="/gospel"
          items={props.linkedGospel.map((g) => ({ id: g.id, label: g.label, status: g.status }))}
          onUnlink={props.onUnlinkGospel}
          unlinkPending={props.linkGospelPending}
        />
        <RelationLinkExisting
          candidates={props.gospelCandidates}
          getLabel={(g) => `${g.title} (${g.language.toUpperCase()})`}
          onLink={props.onLinkGospel}
          pending={props.linkGospelPending}
          value={props.gospelLinkId}
          onValueChange={props.onGospelLinkIdChange}
        />
        <QuickCreateGospel onCreate={props.onCreateGospel} pending={props.createGospelPending} />
        <Button type="button" variant="outline" size="sm" disabled={props.prepareGospelPending} onClick={props.onPrepareGospel}>
          <Sparkles className="size-4" />
          {props.prepareGospelPending ? "Готуємо…" : "Підготувати з AI"}
        </Button>
      </div>
    </div>
  );
}
