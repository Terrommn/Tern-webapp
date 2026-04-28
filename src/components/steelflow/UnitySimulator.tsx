"use client";

import { AppIcon } from "@/components/ui/app-icon";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Line } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { OrderRecord } from "@/types/order";
import type { ProductRecord } from "@/types/product";
import { createClient } from "@/lib/supabase/client";
import { useGamificationContext } from "@/components/steelflow/GamificationProvider";
import { useHandTracker } from "@/lib/hooks/useHandTracker";
import HandControlsOverlay from "@/components/steelflow/HandControlsOverlay";
import HandCameraDriver from "@/components/steelflow/HandCameraDriver";
import {
  createUnityPalletPayloadFromLayout,
  type UnityPalletPayload,
  type UnityPallet,
  type UnityPiece,
} from "@/lib/pallet-calculator";

const GESTURE_XP_SESSION_KEY = "sf-gesture-xp-awarded";
const GESTURE_CONSENT_KEY = "sf-gesture-consent";
const GESTURE_SENSITIVITY_KEY = "sf-gesture-sensitivity";
const SENSITIVITY_MIN = 0.5;
const SENSITIVITY_MAX = 2.0;
const SENSITIVITY_DEFAULT = 1.0;

function clampSensitivity(v: number): number {
  if (!Number.isFinite(v)) return SENSITIVITY_DEFAULT;
  return Math.max(SENSITIVITY_MIN, Math.min(SENSITIVITY_MAX, v));
}

// ─── Sound Effects (Web Audio API — no external files) ──────────────────────

class SFX {
  private ctx: AudioContext | null = null;

  private getCtx(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  }

  private tone(
    freq: number,
    freqEnd: number,
    dur: number,
    vol: number,
    type: OscillatorType = "sine",
  ) {
    const c = this.getCtx();
    const o = c.createOscillator();
    const g = c.createGain();
    o.connect(g);
    g.connect(c.destination);
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(freqEnd, c.currentTime + dur);
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.start(c.currentTime);
    o.stop(c.currentTime + dur);
  }

  select() {
    this.tone(600, 1400, 0.1, 0.12);
  }
  deselect() {
    this.tone(1000, 400, 0.1, 0.08);
  }
  rotate() {
    this.tone(300, 800, 0.18, 0.06, "triangle");
  }
  place() {
    this.tone(150, 40, 0.25, 0.2);
  }
  hover() {
    this.tone(500, 500, 0.05, 0.03);
  }
  anchor() {
    this.tone(800, 1100, 0.08, 0.07, "sine");
  }
  commit() {
    this.tone(400, 200, 0.12, 0.09, "triangle");
  }

  load() {
    const c = this.getCtx();
    const now = c.currentTime;
    [
      { f: 523, t: 0 },
      { f: 784, t: 0.12 },
    ].forEach(({ f, t }) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.connect(g);
      g.connect(c.destination);
      o.type = "sine";
      o.frequency.value = f;
      g.gain.setValueAtTime(0, now + t);
      g.gain.linearRampToValueAtTime(0.1, now + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now + t + 0.25);
      o.start(now + t);
      o.stop(now + t + 0.25);
    });
  }
}

const sfx = new SFX();

// ─── Constants ──────────────────────────────────────────────────────────────

const BASE_H = 0.15;
const PALLET_GAP = 1.5;

const STEEL_COLORS = [
  "#C0C0C0",
  "#8FAABD",
  "#C9956B",
  "#7B8E97",
  "#A09088",
  "#6E7B8B",
];

const WOOD_MAIN = "#B8863C";
const WOOD_DARK = "#8B6914";

// ─── Wooden Pallet Base ─────────────────────────────────────────────────────

function WoodenBase({ width, length }: { width: number; length: number }) {
  const w = Math.max(width, 0.4);
  const l = Math.max(length, 0.4);

  return (
    <group>
      <mesh position={[0, BASE_H - 0.015, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.03, l]} />
        <meshStandardMaterial color={WOOD_MAIN} roughness={0.8} />
      </mesh>
      {[-1, 0, 1].map((i) => (
        <mesh
          key={`support-${i}`}
          position={[i * w * 0.35, BASE_H * 0.45, 0]}
          castShadow
        >
          <boxGeometry args={[0.1, BASE_H * 0.6, l * 0.9]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
        </mesh>
      ))}
      {[-1, 0, 1].map((i) => (
        <mesh
          key={`bottom-${i}`}
          position={[0, 0.015, i * l * 0.35]}
          castShadow
        >
          <boxGeometry args={[w * 0.95, 0.025, 0.1]} />
          <meshStandardMaterial color={WOOD_MAIN} roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Coil Piece (hollow cylinder via LatheGeometry) ─────────────────────────

function CoilPiece({
  piece,
  orientation,
  innerRadiusM,
  color,
  selected,
}: {
  piece: UnityPiece;
  orientation: string;
  innerRadiusM: number;
  color: string;
  selected: boolean;
}) {
  const { width, height } = piece.dimensions_m;

  const isH = orientation === "H";
  const outerR = isH ? width / 2 : height / 2;
  const cylH = isH ? height : width;
  const innerR = Math.min(innerRadiusM, outerR * 0.85);

  const geometry = useMemo(() => {
    const r = Math.max(innerR, 0.01);
    const profile = [
      new THREE.Vector2(r, -cylH / 2),
      new THREE.Vector2(outerR, -cylH / 2),
      new THREE.Vector2(outerR, cylH / 2),
      new THREE.Vector2(r, cylH / 2),
    ];
    return new THREE.LatheGeometry(profile, 48);
  }, [innerR, outerR, cylH]);

  const rot: [number, number, number] = isH ? [0, 0, 0] : [0, 0, Math.PI / 2];

  return (
    <mesh
      geometry={geometry}
      position={[piece.position_m.x, piece.position_m.y, piece.position_m.z]}
      rotation={rot}
      castShadow
    >
      <meshStandardMaterial
        color={color}
        metalness={0.7}
        roughness={0.3}
        side={THREE.DoubleSide}
        emissive={selected ? "#ffffff" : "#000000"}
        emissiveIntensity={selected ? 0.06 : 0}
      />
    </mesh>
  );
}

// ─── Sheet Piece (flat box) ─────────────────────────────────────────────────

function SheetPiece({
  piece,
  color,
  selected,
}: {
  piece: UnityPiece;
  color: string;
  selected: boolean;
}) {
  const { width, height, length } = piece.dimensions_m;
  const h = Math.max(height, 0.005);

  return (
    <mesh
      position={[piece.position_m.x, piece.position_m.y, piece.position_m.z]}
      castShadow
    >
      <boxGeometry args={[width, h, length]} />
      <meshStandardMaterial
        color={color}
        metalness={0.55}
        roughness={0.35}
        emissive={selected ? "#ffffff" : "#000000"}
        emissiveIntensity={selected ? 0.04 : 0}
      />
    </mesh>
  );
}

// ─── Dimension Line (with end ticks + Html label) ───────────────────────────

const DIM_COLOR = "#ffffff";
const DIM_OPACITY = 0.7;
const TICK_HALF = 0.04;

function DimensionLine({
  start,
  end,
  label,
  tickAxis = "x",
}: {
  start: [number, number, number];
  end: [number, number, number];
  label: string;
  /** Axis along which the end-ticks extend (perpendicular to the line). */
  tickAxis?: "x" | "y" | "z";
}) {
  const sv = new THREE.Vector3(...start);
  const ev = new THREE.Vector3(...end);
  const mid: [number, number, number] = [
    (sv.x + ev.x) / 2,
    (sv.y + ev.y) / 2,
    (sv.z + ev.z) / 2,
  ];

  const tickOffset: [number, number, number] =
    tickAxis === "x"
      ? [TICK_HALF, 0, 0]
      : tickAxis === "y"
        ? [0, TICK_HALF, 0]
        : [0, 0, TICK_HALF];
  const off = (p: [number, number, number], sign: number): [number, number, number] => [
    p[0] + tickOffset[0] * sign,
    p[1] + tickOffset[1] * sign,
    p[2] + tickOffset[2] * sign,
  ];

  return (
    <group>
      <Line
        points={[start, end]}
        color={DIM_COLOR}
        transparent
        opacity={DIM_OPACITY}
        lineWidth={1.2}
      />
      <Line
        points={[off(start, -1), off(start, 1)]}
        color={DIM_COLOR}
        transparent
        opacity={DIM_OPACITY}
        lineWidth={1.2}
      />
      <Line
        points={[off(end, -1), off(end, 1)]}
        color={DIM_COLOR}
        transparent
        opacity={DIM_OPACITY}
        lineWidth={1.2}
      />
      <Html
        position={mid}
        center
        style={{ pointerEvents: "none" }}
        distanceFactor={6}
      >
        <span className="rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white whitespace-nowrap select-none">
          {label}
        </span>
      </Html>
    </group>
  );
}

// ─── Orientation Arrow (cone + cylinder) ────────────────────────────────────

function OrientationArrow({
  position,
  direction,
  length = 0.6,
}: {
  position: [number, number, number];
  direction: "up" | "forward";
  length?: number;
}) {
  const shaftR = 0.025;
  const headH = 0.18;
  const headR = 0.08;
  const shaftLen = Math.max(length - headH, 0.05);

  // Cone default points along +Y; rotate to +Z if "forward".
  const groupRot: [number, number, number] =
    direction === "up" ? [0, 0, 0] : [Math.PI / 2, 0, 0];

  return (
    <group position={position} rotation={groupRot}>
      <mesh position={[0, shaftLen / 2, 0]}>
        <cylinderGeometry args={[shaftR, shaftR, shaftLen, 12]} />
        <meshStandardMaterial
          color="#d41111"
          emissive="#d41111"
          emissiveIntensity={0.4}
        />
      </mesh>
      <mesh position={[0, shaftLen + headH / 2, 0]}>
        <coneGeometry args={[headR, headH, 16]} />
        <meshStandardMaterial
          color="#d41111"
          emissive="#d41111"
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  );
}

// ─── Per-piece floating label ───────────────────────────────────────────────

function PieceLabel({
  position,
  gauge,
  weightTon,
  dimensionsMm,
}: {
  position: [number, number, number];
  gauge: string;
  weightTon: number;
  dimensionsMm: { width: number; height: number; length: number };
}) {
  return (
    <Html
      position={position}
      center
      style={{ pointerEvents: "none" }}
      distanceFactor={6}
    >
      <div className="rounded-md bg-black/80 px-2 py-1 text-[10px] font-semibold leading-tight text-white whitespace-nowrap select-none shadow-lg">
        <div className="text-amber-300">{gauge}</div>
        <div>{weightTon.toFixed(2)}t</div>
        <div className="text-slate-300">
          {dimensionsMm.width} × {dimensionsMm.length} × {dimensionsMm.height}mm
        </div>
      </div>
    </Html>
  );
}

// ─── Per-piece overlays (dimensions + arrow + label, only when selected) ────

function PieceOverlays({
  piece,
  product,
  isCoil,
  orientation,
  innerRadiusM,
}: {
  piece: UnityPiece;
  product: ProductRecord | undefined;
  isCoil: boolean;
  orientation: string;
  innerRadiusM: number;
}) {
  const { width, height, length } = piece.dimensions_m;
  const { x, y, z } = piece.position_m;

  if (isCoil) {
    const isH = orientation === "H";
    // For H (eye horizontal/lying flat): outer diameter spans X (width) and Z (length=ext_d), height = mat_w (cyl axis along Y? no — re-check).
    // CoilPiece geometry: when isH (orientation H), profile rotation is identity (axis along Y) — so radius is in XZ, height along Y.
    // When !isH (V/EYE), rotation Z=π/2, axis along X — radius is in YZ.
    const outerR = isH ? width / 2 : height / 2;
    const cylH = isH ? height : width;

    if (isH) {
      // Diameter line on top of coil (across X), at top of cylinder (y + cylH/2)
      const top = y + cylH / 2 + 0.05;
      const diameterLabel = `Ø${piece.dimensions_mm.width}mm`;
      const heightLabel = `${piece.dimensions_mm.height}mm`;
      const sideX = x + outerR + 0.15;
      return (
        <>
          <DimensionLine
            start={[x - outerR, top, z]}
            end={[x + outerR, top, z]}
            label={diameterLabel}
            tickAxis="z"
          />
          <DimensionLine
            start={[sideX, y - cylH / 2, z]}
            end={[sideX, y + cylH / 2, z]}
            label={heightLabel}
            tickAxis="x"
          />
          <OrientationArrow
            position={[x, y - innerRadiusM * 0.2, z]}
            direction="up"
            length={Math.max(cylH * 0.8, 0.4)}
          />
          <PieceLabel
            position={[x, y + cylH / 2 + 0.45, z]}
            gauge={product?.gauge ?? "—"}
            weightTon={piece.weight_ton}
            dimensionsMm={piece.dimensions_mm}
          />
        </>
      );
    }

    // V / EYE (axis along X): diameter is in YZ plane, height along X
    const top = y + outerR + 0.05;
    const diameterLabel = `Ø${piece.dimensions_mm.height}mm`;
    const widthLabel = `${piece.dimensions_mm.width}mm`;
    const sideX = x + cylH / 2 + 0.15;
    return (
      <>
        <DimensionLine
          start={[x, top, z - outerR]}
          end={[x, top, z + outerR]}
          label={diameterLabel}
          tickAxis="x"
        />
        <DimensionLine
          start={[x - cylH / 2, y + outerR + 0.2, z]}
          end={[x + cylH / 2, y + outerR + 0.2, z]}
          label={widthLabel}
          tickAxis="z"
        />
        <OrientationArrow
          position={[x, y, z]}
          direction="forward"
          length={Math.max(outerR * 1.6, 0.4)}
        />
        <PieceLabel
          position={[sideX + 0.4, y + outerR + 0.3, z]}
          gauge={product?.gauge ?? "—"}
          weightTon={piece.weight_ton}
          dimensionsMm={piece.dimensions_mm}
        />
      </>
    );
  }

  // Sheet: width across X, length across Z, top dimensions
  const top = y + height / 2 + 0.05;
  return (
    <>
      <DimensionLine
        start={[x - width / 2, top, z - length / 2 - 0.1]}
        end={[x + width / 2, top, z - length / 2 - 0.1]}
        label={`${piece.dimensions_mm.width}mm`}
        tickAxis="z"
      />
      <DimensionLine
        start={[x + width / 2 + 0.1, top, z - length / 2]}
        end={[x + width / 2 + 0.1, top, z + length / 2]}
        label={`${piece.dimensions_mm.length}mm`}
        tickAxis="x"
      />
      <PieceLabel
        position={[x, top + 0.35, z]}
        gauge={product?.gauge ?? "—"}
        weightTon={piece.weight_ton}
        dimensionsMm={piece.dimensions_mm}
      />
    </>
  );
}

// ─── Pallet Group (base + pieces + rotation + selection) ────────────────────

function PalletGroup({
  pallet,
  xOffset,
  productMap,
  selected,
  targetRotation,
  onSelect,
}: {
  pallet: UnityPallet;
  xOffset: number;
  productMap: Map<string, ProductRecord>;
  selected: boolean;
  targetRotation: number;
  onSelect: () => void;
}) {
  const animRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!animRef.current) return;
    const target = THREE.MathUtils.degToRad(targetRotation);
    animRef.current.rotation.y = THREE.MathUtils.damp(
      animRef.current.rotation.y,
      target,
      5,
      delta,
    );
  });

  const palletH = pallet.dimensions_m.height;
  const palletW = pallet.dimensions_m.width;
  const palletL = pallet.dimensions_m.length;
  const baseW = Math.max(palletW, 0.5) + 0.1;
  const baseL = Math.max(palletL, 0.5) + 0.1;
  const isCoil = pallet.packing_mode === "width";

  return (
    <group position={[xOffset, 0, 0]}>
      <group
        ref={animRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={() => {
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "default";
        }}
      >
        <WoodenBase width={baseW} length={baseL} />

        <group position={[0, BASE_H + palletH / 2, 0]}>
          {pallet.pieces.map((piece) => {
            const product = productMap.get(piece.product_id);
            const color =
              STEEL_COLORS[piece.line_index % STEEL_COLORS.length];
            const innerR = product?.internal_diameter
              ? product.internal_diameter / 2000
              : (Math.min(piece.dimensions_m.width, piece.dimensions_m.length) /
                  2) *
                0.4;

            return (
              <group key={piece.id}>
                {isCoil ? (
                  <CoilPiece
                    piece={piece}
                    orientation={pallet.orientation}
                    innerRadiusM={innerR}
                    color={color}
                    selected={selected}
                  />
                ) : (
                  <SheetPiece
                    piece={piece}
                    color={color}
                    selected={selected}
                  />
                )}
                {selected && (
                  <PieceOverlays
                    piece={piece}
                    product={product}
                    isCoil={isCoil}
                    orientation={pallet.orientation}
                    innerRadiusM={innerR}
                  />
                )}
              </group>
            );
          })}
        </group>

        {selected && (
          <mesh position={[0, (BASE_H + palletH) / 2, 0]}>
            <boxGeometry
              args={[baseW + 0.06, palletH + BASE_H + 0.06, baseL + 0.06]}
            />
            <meshBasicMaterial
              color="#d41111"
              wireframe
              transparent
              opacity={0.4}
            />
          </mesh>
        )}
      </group>

      <Html
        position={[0, BASE_H + palletH + 0.3, 0]}
        center
        style={{ pointerEvents: "none" }}
      >
        <div
          className={`rounded-lg px-2.5 py-1 text-[11px] font-bold whitespace-nowrap select-none transition-colors ${
            selected
              ? "bg-[#d41111] text-white shadow-lg shadow-red-500/30"
              : "bg-black/70 text-white/80"
          }`}
        >
          Tarima #{pallet.pallet_number} &middot;{" "}
          {pallet.total_weight_ton.toFixed(2)}t
        </div>
      </Html>
    </group>
  );
}

// ─── Scene ──────────────────────────────────────────────────────────────────

function PalletScene({
  payload,
  productMap,
  selectedPallet,
  palletRotations,
  onSelectPallet,
}: {
  payload: UnityPalletPayload;
  productMap: Map<string, ProductRecord>;
  selectedPallet: number | null;
  palletRotations: Record<number, number>;
  onSelectPallet: (num: number | null) => void;
}) {
  const offsets = useMemo(() => {
    let cursor = 0;
    return payload.pallets.map((p) => {
      const w = Math.max(p.dimensions_m.width, 0.5) + 0.1;
      const pos = cursor + w / 2;
      cursor += w + PALLET_GAP;
      return pos;
    });
  }, [payload]);

  const totalSpan =
    offsets.length > 0
      ? offsets[offsets.length - 1] +
        (Math.max(
          payload.pallets[payload.pallets.length - 1].dimensions_m.width,
          0.5,
        ) +
          0.1) /
          2
      : 0;
  const center = -totalSpan / 2;

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[8, 15, 10]}
        intensity={1.4}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <directionalLight position={[-5, 8, -5]} intensity={0.5} />
      <hemisphereLight args={["#b1c8ff", "#2c1f12", 0.55]} />

      <fog attach="fog" args={["#0c0f16", 18, 45]} />

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        receiveShadow
      >
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#141820" />
      </mesh>
      <gridHelper args={[60, 60, "#1c2333", "#181e28"]} position={[0, 0, 0]} />

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.02, 0]}
        visible={false}
        onClick={() => {
          onSelectPallet(null);
          sfx.deselect();
        }}
      >
        <planeGeometry args={[200, 200]} />
      </mesh>

      {payload.pallets.map((pallet, i) => (
        <PalletGroup
          key={pallet.pallet_number}
          pallet={pallet}
          xOffset={offsets[i] + center}
          productMap={productMap}
          selected={selectedPallet === pallet.pallet_number}
          targetRotation={palletRotations[pallet.pallet_number] ?? 0}
          onSelect={() => {
            if (selectedPallet === pallet.pallet_number) {
              onSelectPallet(null);
              sfx.deselect();
            } else {
              onSelectPallet(pallet.pallet_number);
              sfx.select();
            }
          }}
        />
      ))}
    </>
  );
}

// ─── Empty scene (no payload) ───────────────────────────────────────────────

function EmptyScene() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} />
      <hemisphereLight args={["#b1c8ff", "#2c1f12", 0.3]} />
      <fog attach="fog" args={["#0c0f16", 15, 40]} />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        receiveShadow
      >
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#141820" />
      </mesh>
      <gridHelper args={[60, 60, "#1c2333", "#181e28"]} />
      <Html center position={[0, 1.5, 0]}>
        <div className="flex flex-col items-center gap-2 select-none">
          <div className="rounded-full bg-slate-800/80 p-4">
            <AppIcon className="text-4xl text-slate-500" name="inventory_2" />
          </div>
          <p className="text-sm font-medium text-slate-500">
            Seleccione una orden para visualizar tarimas
          </p>
        </div>
      </Html>
    </>
  );
}

// ─── Splash screen ──────────────────────────────────────────────────────────

function UnitySplash({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<"logo" | "loading">("logo");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setPhase("loading"), 1500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase !== "loading") return;
    let frame: number;
    let current = 0;
    const tick = () => {
      current += (100 - current) * 0.05 + Math.random() * 3;
      if (current >= 100) {
        setProgress(100);
        setTimeout(onComplete, 300);
        return;
      }
      setProgress(Math.round(current));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, onComplete]);

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0c0f16]">
      {phase === "logo" ? (
        <div className="flex flex-col items-center gap-4 animate-[fadeIn_0.6s_ease-out]">
          <svg
            width="70"
            height="80"
            viewBox="0 0 507.8 555.6"
            fill="white"
          >
            <path d="M410.2 209L253.9 0L216.5 138.9L0 186.1L131.5 277.8L0 369.5L216.5 416.7L253.9 555.6L410.2 346.7L507.8 277.8L410.2 209ZM249.5 139.1L353.2 267.8H249.5V139.1ZM249.5 287.8H353.2L249.5 416.5V287.8ZM229.5 416.5L125.9 287.8H229.5V416.5ZM229.5 267.8H125.9L229.5 139.1V267.8Z" />
          </svg>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[11px] font-light tracking-[0.3em] uppercase text-white/40">
              Powered by
            </span>
            <span className="text-xl font-bold tracking-tight text-white">
              SteelFlow 3D
            </span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <AppIcon
            className="animate-spin text-3xl text-[#d41111]"
            name="progress_activity"
          />
          <div className="w-48">
            <div className="h-1 w-full rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-[#d41111] transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Cargando simulador... {progress}%
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Info Panel (overlay) ───────────────────────────────────────────────────

function InfoPanel({
  pallet,
  productMap,
  onRotateLeft,
  onRotateRight,
}: {
  pallet: UnityPallet;
  productMap: Map<string, ProductRecord>;
  onRotateLeft: () => void;
  onRotateRight: () => void;
}) {
  const d = pallet.dimensions_mm;

  return (
    <div className="absolute right-4 top-4 z-10 w-60 rounded-xl border border-slate-700/60 bg-slate-900/95 p-4 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">
          Tarima #{pallet.pallet_number}
        </h3>
        <span
          className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${
            pallet.packing_mode === "width"
              ? "bg-blue-500/15 text-blue-400"
              : "bg-amber-500/15 text-amber-400"
          }`}
        >
          {pallet.packing_mode === "width" ? "Rollos" : "Laminas"}
        </span>
      </div>

      <div className="mt-3 space-y-1.5 text-xs">
        <Row label="Orientacion" value={pallet.orientation} />
        <Row
          label="Dimensiones"
          value={`${d.width} x ${d.length} x ${d.height} mm`}
        />
        <Row label="Peso" value={`${pallet.total_weight_ton} ton`} />
        <Row label="Piezas" value={String(pallet.pieces.length)} />
      </div>

      {pallet.pieces.length > 0 && (
        <div className="mt-3 border-t border-slate-700/50 pt-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Detalle de piezas
          </p>
          <div className="max-h-32 space-y-1 overflow-y-auto">
            {pallet.pieces.map((piece) => {
              const prod = productMap.get(piece.product_id);
              return (
                <div
                  key={piece.id}
                  className="flex items-center justify-between text-[11px]"
                >
                  <div className="flex items-center gap-1.5">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor:
                          STEEL_COLORS[
                            piece.line_index % STEEL_COLORS.length
                          ],
                      }}
                    />
                    <span className="text-slate-400">
                      {prod?.gauge ?? piece.product_id.slice(0, 8)}
                    </span>
                  </div>
                  <span className="font-medium text-slate-300">
                    {piece.weight_ton.toFixed(2)}t
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-3 flex gap-2 border-t border-slate-700/50 pt-3">
        <button
          type="button"
          onClick={onRotateLeft}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-slate-800 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
        >
          <AppIcon className="text-sm" name="rotate_left" />
          -90&deg;
        </button>
        <button
          type="button"
          onClick={onRotateRight}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-slate-800 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
        >
          <AppIcon className="text-sm" name="rotate_right" />
          +90&deg;
        </button>
      </div>

      <p className="mt-2 text-center text-[10px] text-slate-600">
        Q / E para rotar
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-slate-400">
      <span>{label}</span>
      <span className="font-medium text-slate-200">{value}</span>
    </div>
  );
}

// ─── Assembly Instructions Panel ────────────────────────────────────────────

function AssemblyInstructions({
  payload,
  productMap,
  selectedPallet,
  collapsed,
  onSelectPallet,
  onToggleCollapsed,
}: {
  payload: UnityPalletPayload;
  productMap: Map<string, ProductRecord>;
  selectedPallet: number | null;
  collapsed: boolean;
  onSelectPallet: (n: number | null) => void;
  onToggleCollapsed: () => void;
}) {
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggleCollapsed}
        className="absolute bottom-16 left-4 z-10 flex items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-900/95 px-3 py-2 text-xs font-bold text-white shadow-xl backdrop-blur-sm transition-colors hover:bg-slate-800"
      >
        <AppIcon name="receipt_long" className="text-sm" />
        Pasos de armado ({payload.pallets.length})
      </button>
    );
  }

  return (
    <div className="absolute bottom-16 left-4 z-10 w-[280px] rounded-xl border border-slate-700/60 bg-slate-900/95 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-slate-700/50 px-3 py-2">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-white">
          <AppIcon name="receipt_long" className="text-sm" />
          Pasos de armado
        </h3>
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label="Colapsar panel"
          className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
        >
          <AppIcon name="close" className="text-sm" />
        </button>
      </div>

      <div className="max-h-[320px] space-y-2 overflow-y-auto p-3">
        {payload.pallets.map((pallet, idx) => {
          const isCoil = pallet.packing_mode === "width";
          const stepNum = idx + 1;
          const isSelected = selectedPallet === pallet.pallet_number;
          const firstPiece = pallet.pieces[0];
          const product = firstPiece
            ? productMap.get(firstPiece.product_id)
            : undefined;
          const pieceWeight = firstPiece?.weight_ton ?? 0;
          const d = pallet.dimensions_mm;
          const orientationText =
            pallet.orientation === "H"
              ? "ojo vertical (H)"
              : pallet.orientation === "V"
                ? "ojo horizontal (V)"
                : pallet.orientation === "EYE"
                  ? "ojo horizontal (EYE)"
                  : pallet.orientation;

          const description = isCoil
            ? `Colocar ${pallet.pieces.length} rollo${pallet.pieces.length !== 1 ? "s" : ""} de ${pieceWeight.toFixed(2)}t c/u, ${orientationText}, en tarima ${d.width} × ${d.length}mm`
            : `Colocar ${pallet.pieces.length} lámina${pallet.pieces.length !== 1 ? "s" : ""} de ${pieceWeight.toFixed(2)}t c/u, apiladas, base ${d.width} × ${d.length}mm`;

          return (
            <button
              key={pallet.pallet_number}
              type="button"
              onClick={() => onSelectPallet(pallet.pallet_number)}
              className={`flex w-full items-start gap-3 rounded-lg p-2 text-left transition-colors ${
                isSelected
                  ? "border border-[#d41111] bg-[#d41111]/10"
                  : "border border-transparent bg-slate-800/40 hover:bg-slate-800"
              }`}
            >
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  isSelected
                    ? "bg-[#d41111] text-white"
                    : "bg-slate-700 text-slate-300"
                }`}
              >
                {stepNum}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white">
                    Tarima #{pallet.pallet_number}
                  </span>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                      isCoil
                        ? "bg-blue-500/15 text-blue-300"
                        : "bg-amber-500/15 text-amber-300"
                    }`}
                  >
                    {isCoil ? "Rollos" : "Láminas"}
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] leading-tight text-slate-300">
                  {description}
                </p>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500">
                  {product?.gauge && (
                    <span className="font-medium text-slate-300">
                      {product.gauge}
                    </span>
                  )}
                  <span>·</span>
                  <span>{pallet.total_weight_ton.toFixed(2)}t total</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function UnitySimulator({
  orders = [],
  products = [],
  initialOrderId,
  role,
}: {
  orders?: OrderRecord[];
  products?: ProductRecord[];
  initialOrderId?: number;
  role?: "admin" | "operator" | null;
}) {
  const { awardXP } = useGamificationContext();
  const [loading, setLoading] = useState(true);
  const [localOrders, setLocalOrders] = useState(orders);
  const [selectedOrderId, setSelectedOrderId] = useState<number | "">(
    initialOrderId && orders.some((o) => o.id === initialOrderId)
      ? initialOrderId
      : orders.length > 0
        ? orders[0].id
        : "",
  );
  const [selectedPallet, setSelectedPallet] = useState<number | null>(null);
  const [palletRotations, setPalletRotations] = useState<
    Record<number, number>
  >({});
  const canvasRef = useRef<HTMLDivElement>(null);

  const [handMode, setHandMode] = useState(false);
  const [showHandConsent, setShowHandConsent] = useState(false);
  const [instructionsCollapsed, setInstructionsCollapsed] = useState(false);
  const [sensitivity, setSensitivity] = useState<number>(() => {
    if (typeof window === "undefined") return SENSITIVITY_DEFAULT;
    const stored = window.localStorage.getItem(GESTURE_SENSITIVITY_KEY);
    if (stored === null) return SENSITIVITY_DEFAULT;
    const parsed = parseFloat(stored);
    return Number.isFinite(parsed)
      ? clampSensitivity(parsed)
      : SENSITIVITY_DEFAULT;
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const orbitControlsRef = useRef<OrbitControlsImpl | null>(null);
  const {
    frameRef: handFrameRef,
    status: handStatus,
    gestureLabel: handGesture,
    gestureScore: handGestureScore,
    handedness: handHandedness,
    error: handError,
  } = useHandTracker({ enabled: handMode, videoRef });

  const handleSensitivityChange = useCallback((value: number) => {
    const next = clampSensitivity(value);
    setSensitivity(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(GESTURE_SENSITIVITY_KEY, String(next));
    }
  }, []);

  const handleResetCamera = useCallback(() => {
    orbitControlsRef.current?.reset();
    sfx.deselect();
  }, []);

  const handleAnchor = useCallback(() => {
    sfx.anchor();
  }, []);

  const handleRelease = useCallback(() => {
    sfx.commit();
  }, []);

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  );

  const selectedOrder = useMemo(
    () => localOrders.find((o) => o.id === selectedOrderId),
    [localOrders, selectedOrderId],
  );

  const matchedProduct = useMemo(
    () => (selectedOrder ? productMap.get(selectedOrder.product_id) : undefined),
    [selectedOrder, productMap],
  );

  async function handleMarkArmed() {
    if (!selectedOrder || selectedOrder.status !== "PEN") return;
    const supabase = createClient();
    await supabase
      .from("orders")
      .update({ status: "ARM", updated_at: new Date().toISOString() })
      .eq("id", selectedOrder.id)
      .eq("line_number", selectedOrder.line_number);
    setLocalOrders((prev) =>
      prev.map((o) =>
        o.id === selectedOrder.id && o.line_number === selectedOrder.line_number
          ? { ...o, status: "ARM" }
          : o,
      ),
    );
    await awardXP("order_assembled", "order", String(selectedOrder.id), "Tarima armada correctamente");
  }

  const payload = useMemo<UnityPalletPayload | null>(() => {
    if (!matchedProduct || !selectedOrder) return null;
    const result = createUnityPalletPayloadFromLayout(
      matchedProduct,
      selectedOrder.net_weight_ton,
    );
    return result.pallets.length > 0 ? result : null;
  }, [matchedProduct, selectedOrder]);

  useEffect(() => {
    setSelectedPallet(null);
    setPalletRotations({});
    if (payload) sfx.place();
  }, [payload]);

  const handleLoadComplete = useCallback(() => {
    setLoading(false);
    sfx.load();
  }, []);

  const rotatePallet = useCallback(
    (dir: 1 | -1) => {
      if (selectedPallet === null) return;
      sfx.rotate();
      setPalletRotations((prev) => ({
        ...prev,
        [selectedPallet]: (prev[selectedPallet] ?? 0) + dir * 90,
      }));
    },
    [selectedPallet],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "q" || e.key === "Q") rotatePallet(-1);
      if (e.key === "e" || e.key === "E") rotatePallet(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rotatePallet]);

  const handleFullscreen = useCallback(() => {
    canvasRef.current?.requestFullscreen?.();
  }, []);

  const enableHandMode = useCallback(async () => {
    setHandMode(true);
    sfx.select();
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(GESTURE_XP_SESSION_KEY) === "true") return;
    sessionStorage.setItem(GESTURE_XP_SESSION_KEY, "true");
    try {
      await awardXP(
        "gesture_mode_first_use",
        "feature",
        "hand_controls",
        "Activó control por gestos",
      );
    } catch {
      // XP failure should not block UX
    }
  }, [awardXP]);

  const handleToggleHandMode = useCallback(() => {
    if (handMode) {
      setHandMode(false);
      sfx.deselect();
      return;
    }
    if (
      typeof window !== "undefined" &&
      window.localStorage.getItem(GESTURE_CONSENT_KEY) === "true"
    ) {
      enableHandMode();
      return;
    }
    setShowHandConsent(true);
  }, [handMode, enableHandMode]);

  const handleAcceptConsent = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(GESTURE_CONSENT_KEY, "true");
    }
    setShowHandConsent(false);
    enableHandMode();
  }, [enableHandMode]);

  const handleDeclineConsent = useCallback(() => {
    setShowHandConsent(false);
  }, []);

  const selectedPalletData =
    payload?.pallets.find((p) => p.pallet_number === selectedPallet) ?? null;

  const hasPayload = payload !== null && payload.pallets.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* ── Controls ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Orden
          </label>
          <select
            className="w-full min-w-[300px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white md:w-auto"
            value={selectedOrderId}
            onChange={(e) => {
              const v = e.target.value;
              setSelectedOrderId(v ? Number(v) : "");
              sfx.select();
            }}
          >
            <option value="">Seleccione una orden...</option>
            {localOrders.map((order) => {
              const prod = productMap.get(order.product_id);
              return (
                <option key={`${order.id}-${order.line_number}`} value={order.id}>
                  Orden #{order.id} &middot; Ln {order.line_number} &middot;{" "}
                  {prod?.form ?? "?"} {prod?.gauge ?? ""} &middot;{" "}
                  {order.net_weight_ton}t
                </option>
              );
            })}
          </select>
        </div>

        {hasPayload && (
          <div className="flex items-center gap-6 text-sm text-slate-500 dark:text-slate-400">
            <span>
              <strong className="text-slate-900 dark:text-white">
                {payload.summary.num_pallets}
              </strong>{" "}
              tarima{payload.summary.num_pallets !== 1 && "s"}
            </span>
            <span>
              <strong className="text-slate-900 dark:text-white">
                {payload.summary.num_pieces}
              </strong>{" "}
              pieza{payload.summary.num_pieces !== 1 && "s"}
            </span>
            <span>
              <strong className="text-slate-900 dark:text-white">
                {payload.summary.total_weight_ton.toFixed(2)}
              </strong>{" "}
              ton
            </span>
          </div>
        )}
      </div>

      {/* ── Operator action button ───────────────────────────────────── */}
      {role === "operator" && selectedOrder && (
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${
              selectedOrder.status === "ARM"
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : selectedOrder.status === "CUM"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-primary/10 text-primary"
            }`}>
              {selectedOrder.status === "ARM" ? "Armada" : selectedOrder.status}
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Orden #{selectedOrder.id} · {selectedOrder.net_weight_ton}t
            </span>
          </div>
          {selectedOrder.status === "PEN" && (
            <button
              type="button"
              onClick={handleMarkArmed}
              className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-amber-400"
            >
              <AppIcon className="text-lg" name="inventory" />
              Marcar como Armada (+50 XP)
            </button>
          )}
          {selectedOrder.status === "ARM" && (
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
              <AppIcon className="text-lg" name="check" />
              Armada — marca como CUM desde Órdenes
            </div>
          )}
          {selectedOrder.status === "CUM" && (
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              <AppIcon className="text-lg" name="verified" />
              Orden completada
            </div>
          )}
        </div>
      )}

      {/* ── No product match warning ─────────────────────────────────── */}
      {selectedOrder && !matchedProduct && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
          Producto <strong>{selectedOrder.product_id}</strong> no encontrado en
          el catalogo. No se puede generar layout de tarimas.
        </div>
      )}

      {/* ── 3D Canvas ────────────────────────────────────────────────── */}
      <div
        ref={canvasRef}
        className="relative w-full overflow-hidden rounded-xl border border-slate-200 bg-[#0c0f16] dark:border-slate-800"
      >
        {loading && <UnitySplash onComplete={handleLoadComplete} />}

        {selectedPalletData && !loading && (
          <InfoPanel
            pallet={selectedPalletData}
            productMap={productMap}
            onRotateLeft={() => rotatePallet(-1)}
            onRotateRight={() => rotatePallet(1)}
          />
        )}

        {hasPayload && payload && !loading && (
          <AssemblyInstructions
            payload={payload}
            productMap={productMap}
            selectedPallet={selectedPallet}
            collapsed={instructionsCollapsed}
            onSelectPallet={(n) => {
              setSelectedPallet(n);
              sfx.select();
            }}
            onToggleCollapsed={() =>
              setInstructionsCollapsed((v) => !v)
            }
          />
        )}

        {handMode && (
          <HandControlsOverlay
            videoRef={videoRef}
            frameRef={handFrameRef}
            status={handStatus}
            gestureLabel={handGesture}
            gestureScore={handGestureScore}
            handedness={handHandedness}
            error={handError}
            sensitivity={sensitivity}
            sensitivityMin={SENSITIVITY_MIN}
            sensitivityMax={SENSITIVITY_MAX}
            onSensitivityChange={handleSensitivityChange}
            onReset={handleResetCamera}
            onClose={() => {
              setHandMode(false);
              sfx.deselect();
            }}
          />
        )}

        {showHandConsent && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 p-6">
            <div className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
              <div className="flex items-center gap-2">
                <AppIcon name="webcam" className="text-2xl text-[#d41111]" />
                <h3 className="text-base font-bold text-white">
                  Activar control por gestos
                </h3>
              </div>
              <p className="mt-3 text-sm text-slate-300">
                Necesitamos acceder a tu cámara para detectar gestos de la mano
                y mover la cámara del simulador. El video se procesa
                localmente en tu navegador y no se envía a ningún servidor.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleDeclineConsent}
                  className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAcceptConsent}
                  className="rounded-lg bg-[#d41111] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-600"
                >
                  Activar cámara
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="h-[500px] w-full cursor-grab lg:h-[650px]">
          <Canvas
            shadows
            camera={{ position: [6, 6, 10], fov: 50 }}
            gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
          >
            <color attach="background" args={["#0c0f16"]} />
            {hasPayload ? (
              <PalletScene
                payload={payload}
                productMap={productMap}
                selectedPallet={selectedPallet}
                palletRotations={palletRotations}
                onSelectPallet={setSelectedPallet}
              />
            ) : (
              <EmptyScene />
            )}
            <OrbitControls
              ref={orbitControlsRef}
              makeDefault
              enabled={!handMode}
              maxPolarAngle={Math.PI / 2.1}
              minDistance={1.5}
              maxDistance={35}
            />
            {handMode && (
              <HandCameraDriver
                frameRef={handFrameRef}
                sensitivity={sensitivity}
                onAnchor={handleAnchor}
                onRelease={handleRelease}
              />
            )}
          </Canvas>
        </div>

        <div className="flex items-center justify-between border-t border-slate-800 px-4 py-2.5">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <AppIcon className="text-sm" name="gamepad" />
            <span>
              Click tarima para seleccionar &middot; Q/E rotar &middot; Scroll
              zoom &middot; Click+arrastrar orbitar
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-pressed={handMode}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                handMode
                  ? "bg-[#d41111] text-white hover:bg-red-600"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
              }`}
              onClick={handleToggleHandMode}
            >
              <AppIcon className="text-sm" name="webcam" />
              {handMode ? "Gestos: ON" : "Control por gestos"}
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
              onClick={handleFullscreen}
            >
              <AppIcon className="text-sm" name="fullscreen" />
              Pantalla Completa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
