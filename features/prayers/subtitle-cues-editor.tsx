"use client";

import { Plus, Trash2 } from "lucide-react";
import { Controller, type Control } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PrayerFormValues } from "@/lib/validation/prayer.schema";

function newId(): string {
  return `cue-${Date.now().toString(36)}-${Math.round(Math.random() * 1000)}`;
}

export function SubtitleCuesEditor({ control }: { control: Control<PrayerFormValues> }) {
  return (
    <Controller
      control={control}
      name="subtitleCues"
      render={({ field }) => {
        const cues = field.value ?? [];
        return (
          <div className="space-y-3">
            {cues.length === 0 ? (
              <p className="text-sm text-muted-foreground">Субтитрів ще немає.</p>
            ) : null}
            {cues.map((cue, index) => (
              <div key={cue.id} className="space-y-2 rounded-lg border p-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Початок, мс</label>
                    <Input
                      type="number"
                      min={0}
                      value={cue.startMs}
                      onChange={(e) => {
                        const next = [...cues];
                        next[index] = { ...cue, startMs: Number(e.target.value) };
                        field.onChange(next);
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Кінець, мс</label>
                    <Input
                      type="number"
                      min={0}
                      value={cue.endMs}
                      onChange={(e) => {
                        const next = [...cues];
                        next[index] = { ...cue, endMs: Number(e.target.value) };
                        field.onChange(next);
                      }}
                    />
                  </div>
                </div>
                <Textarea
                  rows={2}
                  value={cue.text}
                  placeholder="Текст субтитра"
                  onChange={(e) => {
                    const next = [...cues];
                    next[index] = { ...cue, text: e.target.value };
                    field.onChange(next);
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => field.onChange(cues.filter((_, i) => i !== index))}
                >
                  <Trash2 className="size-4" />
                  Видалити субтитр
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                field.onChange([
                  ...cues,
                  { id: newId(), startMs: 0, endMs: 2000, text: "" },
                ])
              }
            >
              <Plus className="size-4" />
              Додати субтитр
            </Button>
          </div>
        );
      }}
    />
  );
}
