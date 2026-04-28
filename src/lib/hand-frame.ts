// Stable contract between hook → mapper → driver/overlay.
// Decoupled from @mediapipe/tasks-vision (its API breaks across 0.10.x).
//
// Mirror convention: all x coordinates are mirrored (1 - rawX) so that
// "hand to the user's right" maps to "x increases".

export type GestureName =
  | "Open_Palm"
  | "Closed_Fist"
  | "Pointing_Up"
  | "Thumb_Up"
  | "Thumb_Down"
  | "Victory"
  | "ILoveYou"
  | "None";

export type Handedness = "Left" | "Right";

export type Landmark = {
  x: number;
  y: number;
};

export type HandFrame = {
  timestamp: number;
  gesture: GestureName;
  gestureScore: number;
  handedness: Handedness;
  /** Smoothed palm center (mean of MCPs 0,5,9,13,17), mirrored, [0..1]. */
  palm: Landmark;
  /** All 21 landmarks, mirrored, [0..1]. */
  landmarks: Landmark[];
  /** Distance between thumb tip (4) and index tip (8), normalized [0..~0.5]. */
  pinchDistance: number;
};

export type CameraIntent = {
  azimuthDelta: number;
  elevationDelta: number;
  zoomFactor: number;
  shouldReset: boolean;
};

export const EMPTY_INTENT: CameraIntent = {
  azimuthDelta: 0,
  elevationDelta: 0,
  zoomFactor: 1,
  shouldReset: false,
};
