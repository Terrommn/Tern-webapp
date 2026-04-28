"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef, type RefObject } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { HandFrame } from "@/lib/hand-frame";
import { mapHandFrameToIntent } from "@/lib/hand-camera-mapper";

const RANGE_AZIMUTH = Math.PI;
const RANGE_POLAR = Math.PI / 2;
const ZOOM_LINEAR_RANGE = 20;
const ZOOM_DEAD_ZONE = 0.04;
const ZOOM_DAMPING = 0.18;
const MODE_HOLD_MS = 200;
const DOLLY_EPSILON = 0.001;

type TrackingMode = "orbit" | "zoom" | null;

type Props = {
  frameRef: RefObject<HandFrame | null>;
  sensitivity?: number;
  onAnchor?: (mode: "orbit" | "zoom") => void;
  onRelease?: () => void;
};

export default function HandCameraDriver({
  frameRef,
  sensitivity = 1,
  onAnchor,
  onRelease,
}: Props) {
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const modeRef = useRef<TrackingMode>(null);
  const lastNonIdleAtRef = useRef(0);

  const baseAzRef = useRef(0);
  const basePolarRef = useRef(0);
  const anchorXRef = useRef(0.5);
  const anchorYRef = useRef(0.5);

  const baseDistanceRef = useRef(0);
  const zoomAnchorYRef = useRef(0.5);

  useFrame(() => {
    if (!controls) return;
    const intent = mapHandFrameToIntent(frameRef.current);
    const now = performance.now();

    if (intent.mode === "idle") {
      if (modeRef.current !== null) {
        if (now - lastNonIdleAtRef.current < MODE_HOLD_MS) return;
        modeRef.current = null;
        onRelease?.();
      }
      return;
    }
    lastNonIdleAtRef.current = now;

    if (intent.mode !== modeRef.current) {
      modeRef.current = intent.mode;
      if (intent.mode === "orbit") {
        baseAzRef.current = controls.getAzimuthalAngle();
        basePolarRef.current = controls.getPolarAngle();
        anchorXRef.current = intent.palm.x;
        anchorYRef.current = intent.palm.y;
      } else {
        baseDistanceRef.current = controls.getDistance();
        zoomAnchorYRef.current = intent.palmY;
      }
      onAnchor?.(intent.mode);
      return;
    }

    if (intent.mode === "orbit") {
      const dx = intent.palm.x - anchorXRef.current;
      const dy = intent.palm.y - anchorYRef.current;
      const newAz = baseAzRef.current - dx * RANGE_AZIMUTH * sensitivity;
      const targetPolar =
        basePolarRef.current + dy * RANGE_POLAR * sensitivity;
      const newPolar = Math.max(
        controls.minPolarAngle,
        Math.min(controls.maxPolarAngle, targetPolar),
      );
      controls.setAzimuthalAngle(newAz);
      controls.setPolarAngle(newPolar);
      controls.update();
      return;
    }

    // zoom (linear, symmetric)
    const rawDy = intent.palmY - zoomAnchorYRef.current;
    const absDy = Math.abs(rawDy);
    if (absDy < ZOOM_DEAD_ZONE) return;
    const dy = rawDy - Math.sign(rawDy) * ZOOM_DEAD_ZONE;
    const target =
      baseDistanceRef.current + -dy * ZOOM_LINEAR_RANGE * sensitivity;
    const clamped = Math.max(
      controls.minDistance,
      Math.min(controls.maxDistance, target),
    );
    const current = controls.getDistance();
    if (clamped <= 0) return;
    const damped = current + (clamped - current) * ZOOM_DAMPING;
    if (damped <= 0) return;
    const dollyFactor = current / damped;
    if (Math.abs(dollyFactor - 1) < DOLLY_EPSILON) return;
    controls.dollyIn(dollyFactor);
    controls.update();
  });

  return null;
}
