import { Card, CardContent } from "@/components/ui/card";
import { AUTOPOST_CONTENT_TYPE_LABELS, AUTOPOST_CONTENT_TYPES, type ContentPlanSummary } from "@/types/entities";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-3 py-2 text-center">
      <span className="text-lg font-semibold tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

/** Every number here comes straight from the API's summary block -- never
 * hardcoded or recomputed client-side (task: "Counts должны считаться из
 * API"). */
export function SummaryBar({ summary }: { summary: ContentPlanSummary }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap divide-x">
          <Stat label="днів" value={summary.totalDays} />
          <Stat label="Опубліковано" value={summary.sent} />
          <Stat label="Готово" value={summary.ready + summary.sourceReady} />
          <Stat label="Чернеток" value={summary.draft} />
          <Stat label="слотів без джерела" value={summary.missingSource} />
          <Stat label="потребують перевірки" value={summary.reviewRequired} />
          {summary.failed > 0 ? <Stat label="Помилки" value={summary.failed} /> : null}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground md:justify-end">
          {AUTOPOST_CONTENT_TYPES.map((type) => {
            const c = summary.coverage[type];
            const total = c.available + c.missing;
            return (
              <span key={type}>
                {AUTOPOST_CONTENT_TYPE_LABELS[type]}: <span className="font-medium text-foreground">{c.available}</span>/{total}
              </span>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
