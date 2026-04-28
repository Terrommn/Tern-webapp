import type { HandFrame } from "@/lib/hand-frame";

const MIN_GESTURE_SCORE = 0.3;

export type HandIntent =
  | { mode: "idle" }
  | { mode: "orbit"; palm: { x: number; y: number } }
  | { mode: "zoom"; palmY: number };

export function mapHandFrameToIntent(frame: HandFrame | null): HandIntent {
  if (!frame) return { mode: "idle" };
  if (frame.gestureScore < MIN_GESTURE_SCORE) return { mode: "idle" };
  if (frame.gesture === "Open_Palm") {
    return { mode: "orbit", palm: frame.palm };
  }
  if (frame.gesture === "Victory") {
    return { mode: "zoom", palmY: frame.palm.y };
  }
  return { mode: "idle" };
}
