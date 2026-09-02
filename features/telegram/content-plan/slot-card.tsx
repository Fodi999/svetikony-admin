import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AUTOPOST_CONTENT_TYPE_LABELS, type ContentPlanSlot } from "@/types/entities";
import { StatusBadge } from "./status-badge";

const SOURCE_STATUS_LABELS: Record<ContentPlanSlot["sourceStatus"], string> = {
  available: "Є джерело",
  missing_source: "Немає джерела",
  insufficient_data: "Немає джерела",
};

const VERIFICATION_LABELS: Record<"verified" | "failed", string> = {
  verified: "Перевірено",
  failed: "Не пройшла перевірку",
};

function formatSentAt(sentAt: string): string {
  return new Date(sentAt).toLocaleString("uk-UA");
}

export function SlotCard({ slot }: { slot: ContentPlanSlot }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {slot.scheduledTime} — {AUTOPOST_CONTENT_TYPE_LABELS[slot.contentType]}
        </CardTitle>
        <StatusBadge status={slot.publicationStatus} />
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>Джерело: {SOURCE_STATUS_LABELS[slot.sourceStatus]}</span>
          {slot.verificationStatus ? <span>Перевірка: {VERIFICATION_LABELS[slot.verificationStatus]}</span> : null}
          <span>Текст: {slot.textAvailable ? "є" : "немає"}</span>
          <span>Зображення: {slot.imageAvailable ? "є" : "немає"}</span>
        </div>

        {slot.publicationStatus === "REVIEW_REQUIRED" ? (
          <p className="text-sm text-orange-400">Потрібна перевірка календаря</p>
        ) : null}

        {slot.sourceStatus !== "available" && slot.publicationStatus === "MISSING_SOURCE" ? (
          <p className="text-sm text-muted-foreground">Немає джерела</p>
        ) : null}

        {slot.textPreview ? <p className="whitespace-pre-wrap text-sm text-foreground/90">{slot.textPreview}…</p> : null}

        {slot.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={slot.imageUrl} alt="" className="h-24 w-full rounded-md border object-cover" />
        ) : null}

        {slot.errorMessage ? <p className="text-xs text-destructive">{slot.errorMessage}</p> : null}

        {slot.publicationStatus === "SENT" ? (
          <p className="text-xs text-muted-foreground">
            {slot.telegramMessageId ? `Message ID: ${slot.telegramMessageId}` : null}
            {slot.telegramMessageId && slot.sentAt ? " · " : null}
            {slot.sentAt ? formatSentAt(slot.sentAt) : null}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
