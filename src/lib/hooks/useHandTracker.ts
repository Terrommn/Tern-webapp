"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { GestureRecognizer } from "@mediapipe/tasks-vision";
import { OneEuroFilter } from "@/lib/one-euro-filter";
import type {
  GestureName,
  HandFrame,
  Handedness,
  Landmark,
} from "@/lib/hand-frame";

const WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task";

const PALM_INDICES = [0, 5, 9, 13, 17] as const;

type VideoWithVFC = HTMLVideoElement & {
  requestVideoFrameCallback: (cb: () => void) => number;
  cancelVideoFrameCallback: (id: number) => void;
};

export type HandTrackerStatus = "idle" | "loading" | "ready" | "error";

export type UseHandTrackerArgs = {
  enabled: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
};

export type UseHandTrackerReturn = {
  frameRef: RefObject<HandFrame | null>;
  status: HandTrackerStatus;
  gestureLabel: GestureName;
  gestureScore: number;
  handedness: Handedness | null;
  error: string | null;
};

export function useHandTracker({
  enabled,
  videoRef,
}: UseHandTrackerArgs): UseHandTrackerReturn {
  const frameRef = useRef<HandFrame | null>(null);
  const [status, setStatus] = useState<HandTrackerStatus>("idle");
  const [gestureLabel, setGestureLabel] = useState<GestureName>("None");
  const [gestureScore, setGestureScore] = useState(0);
  const [handedness, setHandedness] = useState<Handedness | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      setGestureLabel("None");
      setGestureScore(0);
      setHandedness(null);
      setError(null);
      frameRef.current = null;
      return;
    }

    const videoEl = videoRef.current;
    if (!videoEl) {
      setError("No se encontró el elemento <video> del overlay.");
      setStatus("error");
      return;
    }

    let cancelled = false;
    let stream: MediaStream | null = null;
    let recognizer: GestureRecognizer | null = null;
    let vfcId: number | null = null;
    let timerId: number | null = null;
    let lastGesture: GestureName = "None";
    let lastHand: Handedness | null = null;
    let lastScoreEmit = 0;

    const palmXFilter = new OneEuroFilter({ minCutoff: 1.5, beta: 0.05 });
    const palmYFilter = new OneEuroFilter({ minCutoff: 1.5, beta: 0.05 });
    const pinchFilter = new OneEuroFilter({ minCutoff: 1.5, beta: 0.05 });

    setStatus("loading");
    setError(null);

    const start = async () => {
      let mediaStream: MediaStream | null = null;
      try {
        const [mp, ms] = await Promise.all([
          import("@mediapipe/tasks-vision"),
          navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 },
            audio: false,
          }),
        ]);
        mediaStream = ms;

        if (cancelled) {
          ms.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = ms;

        const fileset = await mp.FilesetResolver.forVisionTasks(WASM_BASE);
        if (cancelled) return;

        const r = await mp.GestureRecognizer.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.3,
          minHandPresenceConfidence: 0.3,
          minTrackingConfidence: 0.3,
        });
        if (cancelled) {
          r.close();
          return;
        }
        recognizer = r;

        videoEl.srcObject = stream;
        try {
          await videoEl.play();
        } catch {
          // Autoplay may reject silently; readyState will still progress.
        }
        if (cancelled) return;
        setStatus("ready");

        const supportsVFC =
          "requestVideoFrameCallback" in HTMLVideoElement.prototype;

        const tick = () => {
          if (cancelled || !recognizer) return;
          const v = videoEl;
          if (v.readyState < 2 || v.videoWidth === 0) {
            scheduleNext();
            return;
          }

          const now = performance.now();
          let result;
          try {
            result = recognizer.recognizeForVideo(v, now);
          } catch {
            scheduleNext();
            return;
          }

          if (!result.landmarks || result.landmarks.length === 0) {
            frameRef.current = null;
            if (lastGesture !== "None" || lastHand !== null) {
              lastGesture = "None";
              lastHand = null;
              setGestureLabel("None");
              setGestureScore(0);
              setHandedness(null);
            }
            scheduleNext();
            return;
          }

          const raw = result.landmarks[0];
          const mirrored: Landmark[] = raw.map((l) => ({
            x: 1 - l.x,
            y: l.y,
          }));

          let palmX = 0;
          let palmY = 0;
          for (const i of PALM_INDICES) {
            palmX += mirrored[i].x;
            palmY += mirrored[i].y;
          }
          palmX /= PALM_INDICES.length;
          palmY /= PALM_INDICES.length;

          const palmXSm = palmXFilter.filter(palmX, now);
          const palmYSm = palmYFilter.filter(palmY, now);

          const dxP = mirrored[4].x - mirrored[8].x;
          const dyP = mirrored[4].y - mirrored[8].y;
          const pinchRaw = Math.sqrt(dxP * dxP + dyP * dyP);
          const pinch = pinchFilter.filter(pinchRaw, now);

          let gesture: GestureName = "None";
          let score = 0;
          if (
            result.gestures &&
            result.gestures.length > 0 &&
            result.gestures[0].length > 0
          ) {
            const top = result.gestures[0][0];
            gesture = top.categoryName as GestureName;
            score = top.score;
          }

          let hand: Handedness = "Right";
          if (
            result.handedness &&
            result.handedness.length > 0 &&
            result.handedness[0].length > 0
          ) {
            // Video is mirrored visually, so MediaPipe's "Left" is the user's right hand.
            const rawHand = result.handedness[0][0].categoryName;
            hand = rawHand === "Left" ? "Right" : "Left";
          }

          frameRef.current = {
            timestamp: now,
            gesture,
            gestureScore: score,
            handedness: hand,
            palm: { x: palmXSm, y: palmYSm },
            landmarks: mirrored,
            pinchDistance: pinch,
          };

          if (gesture !== lastGesture) {
            lastGesture = gesture;
            setGestureLabel(gesture);
          }
          if (hand !== lastHand) {
            lastHand = hand;
            setHandedness(hand);
          }
          if (now - lastScoreEmit > 150) {
            lastScoreEmit = now;
            setGestureScore(score);
          }

          scheduleNext();
        };

        const scheduleNext = () => {
          if (cancelled) return;
          if (supportsVFC) {
            vfcId = (videoEl as VideoWithVFC).requestVideoFrameCallback(() => {
              vfcId = null;
              tick();
            });
          } else {
            timerId = window.setTimeout(() => {
              timerId = null;
              tick();
            }, 33);
          }
        };

        scheduleNext();
      } catch (err) {
        if (mediaStream && !stream) {
          mediaStream.getTracks().forEach((t) => t.stop());
        }
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          setError(msg);
          setStatus("error");
        }
      }
    };

    start();

    return () => {
      cancelled = true;
      if (vfcId !== null && "cancelVideoFrameCallback" in videoEl) {
        try {
          (videoEl as VideoWithVFC).cancelVideoFrameCallback(vfcId);
        } catch {
          // ignore
        }
      }
      if (timerId !== null) {
        clearTimeout(timerId);
      }
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      try {
        videoEl.srcObject = null;
        videoEl.removeAttribute("src");
        videoEl.load();
      } catch {
        // ignore
      }
      if (recognizer) {
        try {
          recognizer.close();
        } catch {
          // ignore
        }
      }
      frameRef.current = null;
    };
  }, [enabled, videoRef]);

  return { frameRef, status, gestureLabel, gestureScore, handedness, error };
}
