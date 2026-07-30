"use client";

import { Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";

/** What a field should store differs by module: Prayer's audioUrl/imageUrl
 * are raw URLs rendered directly, while e.g. CalendarDay.imageId stores a
 * media-library reference (the mock asset's `id` in mock mode, the R2
 * object `key` in real mode) — `id` here always means "whatever that
 * reference is", not literally MediaAsset.id. Callers pick whichever of
 * `id`/`url` their field actually wants. */
export interface UploadedMedia {
  id: string;
  url: string;
}

interface MediaUploadButtonProps {
  kind: "image" | "audio";
  /** Matches svet-ikony's lib/media/constants.ts ALLOWED_MODULE_PURPOSES — e.g. "prayers". */
  module: string;
  /** The record this file belongs to; "draft" for a not-yet-saved new record. */
  entityId: string;
  /** Matches the module's allowed purposes, e.g. "audio" / "image" for prayers. */
  purpose: string;
  onUploaded: (result: UploadedMedia) => void;
  label?: string;
}

/**
 * Uses the real R2 upload (`apiClient.media.uploadObject`) when the active
 * adapter implements it (the default — see lib/api/index.ts), and falls
 * back to the Stage 1 mock media library (`apiClient.media.upload`)
 * otherwise (`NEXT_PUBLIC_FORCE_MOCK_API=true`) — `uploadObject` is
 * optional on MediaApi precisely so this can detect which one is
 * available instead of assuming a mode.
 */
export function MediaUploadButton({ kind, module, entityId, purpose, onUploaded, label }: MediaUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const result = apiClient.media.uploadObject
        ? await apiClient.media.uploadObject({ file, module, entityId, purpose }).then((r) => ({ id: r.key, url: r.url }))
        : await apiClient.media.upload(file).then((asset) => ({ id: asset.id, url: asset.url }));
      onUploaded(result);
      toast.success("Файл завантажено");
    } catch (error) {
      toast.error(errorMessageFor(error));
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <input ref={inputRef} type="file" accept={kind === "audio" ? "audio/*" : "image/*"} className="hidden" onChange={handleChange} />
      <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
        {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        {label ?? (kind === "audio" ? "Завантажити аудіо" : "Завантажити зображення")}
      </Button>
    </>
  );
}
