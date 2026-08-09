"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/**
 * Shows exactly what QR code will actually appear on the public prayer
 * page — svet-ikony's PrayerQr component always encodes the prayer's own
 * public URL (never the admin's separate, unused `qrCodeUrl` text field;
 * see components/site/PrayerQr.tsx), so this mirrors that logic and those
 * exact rendering options rather than reading `qrCodeUrl`.
 */
export function QrCodePreview({ url, label }: { url: string; label: string }) {
  const [dataUrl, setDataUrl] = useState("");
  // Tracks which `url` the current `dataUrl` was generated for, so a stale
  // preview is never shown while a new one is still generating (or after
  // `url` becomes empty) — without needing a synchronous setState call in
  // the effect body itself.
  const [generatedForUrl, setGeneratedForUrl] = useState("");

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    QRCode.toDataURL(url, { margin: 1, width: 160, color: { dark: "#111827", light: "#ffffff" } })
      .then((value) => {
        if (cancelled) return;
        setDataUrl(value);
        setGeneratedForUrl(url);
      })
      .catch(() => {
        if (cancelled) return;
        setDataUrl("");
        setGeneratedForUrl(url);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!url || generatedForUrl !== url || !dataUrl) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={dataUrl} alt={label} width={160} height={160} className="rounded-md border" />
      <p className="break-all text-xs text-muted-foreground">{url}</p>
    </div>
  );
}
