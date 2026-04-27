"use client";

import { AppIcon } from "@/components/ui/app-icon";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import type { OrderRecord } from "@/types/order";
import type { ProductRecord } from "@/types/product";
import {
  createUnityPalletPayloadFromLayout,
  type UnityPalletPayload,
  type UnityPallet,
  type UnityPiece,
} from "@/lib/pallet-calculator";

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
        metalness={0.85}
        roughness={0.15}
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
        metalness={0.7}
        roughness={0.25}
        emissive={selected ? "#ffffff" : "#000000"}
        emissiveIntensity={selected ? 0.04 : 0}
      />
    </mesh>
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

            return isCoil ? (
              <CoilPiece
                key={piece.id}
                piece={piece}
                orientation={pallet.orientation}
                innerRadiusM={innerR}
                color={color}
                selected={selected}
              />
            ) : (
              <SheetPiece
                key={piece.id}
                piece={piece}
                color={color}
                selected={selected}
              />
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
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[8, 15, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <directionalLight position={[-5, 8, -5]} intensity={0.3} />
      <hemisphereLight args={["#b1c8ff", "#2c1f12", 0.35]} />

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
            <span className="material-symbols-rounded text-4xl text-slate-500">
              inventory_2
            </span>
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

// ─── Main Component ─────────────────────────────────────────────────────────

export function UnitySimulator({
  orders = [],
  products = [],
  initialOrderId,
}: {
  orders?: OrderRecord[];
  products?: ProductRecord[];
  initialOrderId?: number;
}) {
  const [loading, setLoading] = useState(true);
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

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  );

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId),
    [orders, selectedOrderId],
  );

  const matchedProduct = useMemo(
    () => (selectedOrder ? productMap.get(selectedOrder.product_id) : undefined),
    [selectedOrder, productMap],
  );

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
            {orders.map((order) => {
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
              makeDefault
              maxPolarAngle={Math.PI / 2.1}
              minDistance={1.5}
              maxDistance={35}
            />
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
  );
}
