import { useSyncExternalStore } from "react";
import { cubicBezier } from "motion/react";
import type { LayoutMode } from "./graph";

export const ease = [0.22, 1, 0.36, 1] as const;
export const cameraEase = cubicBezier(...ease);
export const cx = (...names: (string | false | null | undefined)[]) =>
  names.filter(Boolean).join(" ");

function mediaStore(query: string) {
  const media = matchMedia(query);
  return {
    get: () => media.matches,
    subscribe: (notify: () => void) => {
      media.addEventListener("change", notify);
      return () => media.removeEventListener("change", notify);
    },
  };
}
const motionMedia = mediaStore("(prefers-reduced-motion: reduce)");
const narrowMedia = mediaStore("(max-width: 700px)");
export const reducedMotion = motionMedia.get;
export const isNarrow = narrowMedia.get;
// Keep every animation, including SVG and dimensions, in sync with live OS changes.
export const useReducedMotion = () =>
  useSyncExternalStore(motionMedia.subscribe, motionMedia.get);
export const useLayoutMode = (): LayoutMode =>
  useSyncExternalStore(narrowMedia.subscribe, narrowMedia.get)
    ? "narrow"
    : "wide";
