"use client";

import { useEffect, useRef, useState } from "react";
import type { DetailedHTMLProps, HTMLAttributes } from "react";
import { Loader2, Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * `<model-viewer>` is a custom element (Web Component) registered as a
 * side effect of importing "@google/model-viewer" — it isn't a normal
 * React component, so React's built-in JSX types don't know about it.
 * Scoped to just this file rather than a project-wide ambient .d.ts, since
 * this is the only place it's used.
 */
/* eslint-disable @typescript-eslint/no-namespace -- `namespace` is the only
   TypeScript syntax that can augment the ambient `React.JSX.IntrinsicElements`
   interface; there is no ES2015-module equivalent for this. */
declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        "model-viewer": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
          src?: string;
          alt?: string;
          "camera-controls"?: boolean;
          "auto-rotate"?: boolean;
          "shadow-intensity"?: string;
          exposure?: string;
          "interaction-prompt"?: string;
        };
      }
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

/** Matches @google/model-viewer's own ModelViewerElement shape closely
 * enough for the imperative calls this preview actually makes — avoids
 * importing the full package type (which pulls in three's own types too)
 * just for a handful of method/property signatures. */
type ModelViewerEl = HTMLElement & {
  play: (options?: { repetitions?: number }) => void;
  pause: () => void;
  paused: boolean;
  availableAnimations: string[];
  currentTime: number;
  cameraOrbit: string;
};

/**
 * Admin-only GLB preview: orbit/zoom (built into `<model-viewer>`'s own
 * camera-controls), a play/pause toggle and a "reset camera" button, and a
 * detected-animation-names list when the GLB has any animation clips. Uses
 * the `@google/model-viewer` web component rather than a hand-rolled
 * Three.js scene here — it already provides everything this admin preview
 * needs (orbit, zoom, animation control) with a fraction of the code a
 * custom viewer would take; the PUBLIC visualizer still uses raw Three.js
 * directly, since it needs bespoke camera-pan-to-coordinates behavior no
 * off-the-shelf viewer provides.
 */
export function ModelViewerPreview({ src, alt }: { src: string; alt?: string }) {
  const elementRef = useRef<ModelViewerEl | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [animationNames, setAnimationNames] = useState<string[]>([]);
  const defaultCameraOrbitRef = useRef<string | null>(null);

  // Resets preview state during render when `src` changes (React's own
  // recommended "adjusting state when a prop changes" pattern), rather
  // than an effect that calls setState synchronously on every run -- see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes.
  const [previousSrc, setPreviousSrc] = useState(src);
  if (src !== previousSrc) {
    setPreviousSrc(src);
    setReady(false);
    setPlaying(false);
    setAnimationNames([]);
  }

  useEffect(() => {
    void import("@google/model-viewer");
  }, []);

  // `<model-viewer>` is a custom element -- its `load` event is a plain
  // native DOM event, not one of React's synthetic events, so it's
  // attached directly rather than via a JSX `onLoad` prop (which isn't
  // guaranteed to be wired through for arbitrary custom elements). Re-runs
  // whenever `src` changes, since the element re-fires `load` for a new model.
  useEffect(() => {
    defaultCameraOrbitRef.current = null;
    const element = elementRef.current;
    if (!element) return;

    function handleLoad() {
      if (!element) return;
      setReady(true);
      setAnimationNames(element.availableAnimations ?? []);
      setPlaying(!element.paused);
      if (defaultCameraOrbitRef.current === null) defaultCameraOrbitRef.current = element.cameraOrbit;
    }

    element.addEventListener("load", handleLoad);
    return () => element.removeEventListener("load", handleLoad);
  }, [src]);

  function togglePlayback() {
    const element = elementRef.current;
    if (!element) return;
    if (element.paused) {
      element.play();
      setPlaying(true);
    } else {
      element.pause();
      setPlaying(false);
    }
  }

  function resetCamera() {
    const element = elementRef.current;
    if (!element || defaultCameraOrbitRef.current === null) return;
    element.cameraOrbit = defaultCameraOrbitRef.current;
  }

  return (
    <div className="space-y-2">
      <div className="relative h-64 w-full overflow-hidden rounded-md border bg-muted">
        <model-viewer
          ref={elementRef as unknown as React.RefObject<HTMLElement>}
          src={src}
          alt={alt ?? "3D модель"}
          camera-controls
          interaction-prompt="none"
          shadow-intensity="1"
          exposure="1"
          style={{ width: "100%", height: "100%" }}
        />
        {!ready ? (
          <div className="absolute inset-0 grid place-items-center bg-muted/80">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : null}
      </div>
      {ready ? (
        <div className="flex flex-wrap items-center gap-2">
          {animationNames.length > 0 ? (
            <>
              <Button type="button" variant="outline" size="sm" onClick={togglePlayback}>
                {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
                {playing ? "Пауза" : "Відтворити"}
              </Button>
              <span className="text-xs text-muted-foreground">
                Анімація виявлена: {animationNames.join(", ")}
              </span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">Анімація не знайдена</span>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={resetCamera}>
            <RotateCcw className="size-4" />
            Скинути камеру
          </Button>
        </div>
      ) : null}
    </div>
  );
}
