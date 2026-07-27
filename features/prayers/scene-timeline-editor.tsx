"use client";

import { Plus, Trash2 } from "lucide-react";
import { Controller, type Control } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PrayerFormValues } from "@/lib/validation/prayer.schema";

function newId(): string {
  return `scene-${Date.now().toString(36)}-${Math.round(Math.random() * 1000)}`;
}

export function SceneTimelineEditor({ control }: { control: Control<PrayerFormValues> }) {
  return (
    <Controller
      control={control}
      name="sceneTimeline"
      render={({ field }) => {
        const scenes = field.value ?? [];
        return (
          <div className="space-y-3">
            {scenes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Подій сцени ще немає.</p>
            ) : null}
            {scenes.map((scene, index) => (
              <div key={scene.id} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2 rounded-lg border p-3">
                <div>
                  <label className="text-xs text-muted-foreground">Момент, мс</label>
                  <Input
                    type="number"
                    min={0}
                    value={scene.atMs}
                    onChange={(e) => {
                      const next = [...scenes];
                      next[index] = { ...scene, atMs: Number(e.target.value) };
                      field.onChange(next);
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Назва події</label>
                  <Input
                    value={scene.label}
                    onChange={(e) => {
                      const next = [...scenes];
                      next[index] = { ...scene, label: e.target.value };
                      field.onChange(next);
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => field.onChange(scenes.filter((_, i) => i !== index))}
                  aria-label="Видалити подію"
                >
                  <Trash2 className="size-4" />
                </Button>
                <div className="col-span-3">
                  <label className="text-xs text-muted-foreground">Інтенсивність (0–1)</label>
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={scene.intensity}
                    onChange={(e) => {
                      const next = [...scenes];
                      next[index] = { ...scene, intensity: Number(e.target.value) };
                      field.onChange(next);
                    }}
                  />
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                field.onChange([...scenes, { id: newId(), atMs: 0, label: "", intensity: 0.5 }])
              }
            >
              <Plus className="size-4" />
              Додати подію сцени
            </Button>
          </div>
        );
      }}
    />
  );
}
