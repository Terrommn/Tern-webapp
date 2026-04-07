"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

function MovableCube() {
  const meshRef = useRef<THREE.Mesh>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const isDragging = useRef(false);
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const dragOffset = useRef(new THREE.Vector3());
  const { camera, gl } = useThree();

  const speed = 5;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => keysRef.current.add(e.key.toLowerCase());
    const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const intersection = new THREE.Vector3();

    const onPointerDown = (e: PointerEvent) => {
      if (!meshRef.current) return;
      const rect = gl.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObject(meshRef.current);
      if (hits.length > 0) {
        isDragging.current = true;
        dragPlane.current.set(new THREE.Vector3(0, 1, 0), -meshRef.current.position.y);
        raycaster.ray.intersectPlane(dragPlane.current, intersection);
        dragOffset.current.copy(meshRef.current.position).sub(intersection);
        gl.domElement.style.cursor = "grabbing";
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging.current || !meshRef.current) return;
      const rect = gl.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      raycaster.ray.intersectPlane(dragPlane.current, intersection);
      meshRef.current.position.x = intersection.x + dragOffset.current.x;
      meshRef.current.position.z = intersection.z + dragOffset.current.z;
    };

    const onPointerUp = () => {
      isDragging.current = false;
      gl.domElement.style.cursor = "grab";
    };

    const el = gl.domElement;
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.style.cursor = "grab";
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
    };
  }, [camera, gl]);

  useFrame((_, delta) => {
    if (!meshRef.current || isDragging.current) return;
    const keys = keysRef.current;
    const move = new THREE.Vector3();
    if (keys.has("w") || keys.has("arrowup")) move.z -= 1;
    if (keys.has("s") || keys.has("arrowdown")) move.z += 1;
    if (keys.has("a") || keys.has("arrowleft")) move.x -= 1;
    if (keys.has("d") || keys.has("arrowright")) move.x += 1;
    if (move.length() > 0) {
      move.normalize().multiplyScalar(speed * delta);
      meshRef.current.position.add(move);
    }
    meshRef.current.rotation.y += 0.3 * delta;
  });

  return (
    <mesh ref={meshRef} position={[0, 0.9, 0]} castShadow>
      <boxGeometry args={[1.8, 1.8, 1.8]} />
      <meshStandardMaterial color="#ffffff" metalness={0.6} roughness={0.3} />
    </mesh>
  );
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial color="#181e2a" />
    </mesh>
  );
}

function GridFloor() {
  return <gridHelper args={[20, 20, "#282e39", "#1c2333"]} position={[0, 0.01, 0]} />;
}

function UnitySplash({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<"logo" | "loading">("logo");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const splashTimer = setTimeout(() => setPhase("loading"), 2000);
    return () => clearTimeout(splashTimer);
  }, []);

  useEffect(() => {
    if (phase !== "loading") return;
    let frame: number;
    let current = 0;
    const tick = () => {
      current += (100 - current) * 0.04 + Math.random() * 2;
      if (current >= 100) {
        setProgress(100);
        setTimeout(onComplete, 400);
        return;
      }
      setProgress(Math.round(current));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, onComplete]);

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#1a1a2e]">
      {phase === "logo" ? (
        <div className="flex flex-col items-center gap-4 animate-[fadeIn_0.6s_ease-out]">
          {/* Unity logo */}
          <svg width="80" height="90" viewBox="0 0 507.8 555.6" fill="white">
            <path d="M410.2 209L253.9 0L216.5 138.9L0 186.1L131.5 277.8L0 369.5L216.5 416.7L253.9 555.6L410.2 346.7L507.8 277.8L410.2 209ZM249.5 139.1L353.2 267.8H249.5V139.1ZM249.5 287.8H353.2L249.5 416.5V287.8ZM229.5 416.5L125.9 287.8H229.5V416.5ZM229.5 267.8H125.9L229.5 139.1V267.8Z" />
          </svg>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[11px] font-light tracking-[0.3em] uppercase text-white/50">
              Made with
            </span>
            <span className="text-2xl font-bold tracking-tight text-white">
              Unity
            </span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <span className="material-symbols-outlined animate-spin text-4xl text-[#d41111]">
            progress_activity
          </span>
          <div className="w-48">
            <div className="h-1.5 w-full rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-[#d41111] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-center text-xs font-bold uppercase tracking-wider text-slate-400">
              Cargando simulador... {progress}%
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function UnitySimulator() {
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleLoadComplete = useCallback(() => setLoading(false), []);

  const handleFullscreen = useCallback(() => {
    canvasRef.current?.requestFullscreen?.();
  }, []);

  return (
    <div ref={canvasRef} className="relative w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-950 dark:border-slate-800">
      {loading && <UnitySplash onComplete={handleLoadComplete} />}

      <div className="h-[500px] w-full lg:h-[600px]">
        <Canvas
          shadows
          camera={{ position: [5, 8, 8], fov: 50 }}
          gl={{ antialias: true }}
          tabIndex={0}
        >
          <color attach="background" args={["#101622"]} />
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[5, 10, 5]}
            intensity={1}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <MovableCube />
          <Ground />
          <GridFloor />
          <OrbitControls enablePan={false} maxPolarAngle={Math.PI / 2.2} />
        </Canvas>
      </div>

      <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="material-symbols-outlined text-sm">gamepad</span>
          <span>WASD / Flechas para mover | Click y arrastrar el cubo</span>
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
          onClick={handleFullscreen}
        >
          <span className="material-symbols-outlined text-sm">fullscreen</span>
          Pantalla Completa
        </button>
      </div>
    </div>
  );
}
