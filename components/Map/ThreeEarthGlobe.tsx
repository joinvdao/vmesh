"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

import {
  clampOrbitTilt,
  damp,
  latLngToSpherePoint,
  lerpAngle,
  targetRotationForCoordinate
} from "@/components/Map/threeEarthCamera";
import type { GlobeCoordinate, GlobeRotation } from "@/components/Map/threeEarthCamera";
import {
  createEarthMaterialSet,
  disposeEarthMaterialSet
} from "@/components/Map/threeEarthMaterials";
import type { GlobeViewerMode } from "@/lib/globeViewer";
import type { GlobeTheme } from "@/lib/vmeshTypes";

interface ThreeEarthGlobeProps {
  viewerMode: GlobeViewerMode;
  globeTheme: GlobeTheme;
  targetCoordinate: GlobeCoordinate;
  flightId: number | null;
  onOrbitWheelZoom: (deltaY: number) => void;
}

interface ThreeEarthRuntime {
  setViewerMode: (mode: GlobeViewerMode) => void;
  setTarget: (coordinate: GlobeCoordinate, flightId: number | null) => void;
}

interface PointerState {
  isDragging: boolean;
  pointerId: number | null;
  previousX: number;
  previousY: number;
  previousTime: number;
}

function setVectorFromCoordinate(
  vector: THREE.Vector3,
  coordinate: GlobeCoordinate,
  radius: number
) {
  const point = latLngToSpherePoint(coordinate, radius);
  vector.set(point.x, point.y, point.z);
}

function getReducedMotionPreference(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function ThreeEarthGlobe({
  viewerMode,
  globeTheme,
  targetCoordinate,
  flightId,
  onOrbitWheelZoom
}: ThreeEarthGlobeProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const runtimeRef = useRef<ThreeEarthRuntime | null>(null);
  const onOrbitWheelZoomRef = useRef(onOrbitWheelZoom);
  const lastFlightIdRef = useRef<number | null>(flightId);
  const latestTargetRef = useRef<GlobeCoordinate>(targetCoordinate);
  const latestViewerModeRef = useRef<GlobeViewerMode>(viewerMode);
  const targetLatitude = targetCoordinate.latitude;
  const targetLongitude = targetCoordinate.longitude;

  useEffect(() => {
    latestTargetRef.current = {
      latitude: targetLatitude,
      longitude: targetLongitude
    };
    latestViewerModeRef.current = viewerMode;
    onOrbitWheelZoomRef.current = onOrbitWheelZoom;
  }, [onOrbitWheelZoom, targetLatitude, targetLongitude, viewerMode]);

  useEffect(() => {
    runtimeRef.current?.setViewerMode(viewerMode);
  }, [viewerMode]);

  useEffect(() => {
    runtimeRef.current?.setTarget(
      { latitude: targetLatitude, longitude: targetLongitude },
      flightId
    );
  }, [flightId, targetLatitude, targetLongitude]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let animationFrame: number | undefined;
    let resizeFrame: number | undefined;
    let disposed = false;
    const initialTarget = latestTargetRef.current;
    const initialViewerMode = latestViewerModeRef.current;
    const initialFlightId = lastFlightIdRef.current;
    const reducedMotion = getReducedMotionPreference();
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 4.2);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = globeTheme === "dark" ? 1.12 : 1;
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.style.touchAction = "none";
    mount.appendChild(renderer.domElement);

    const root = new THREE.Group();
    const initialRotation = targetRotationForCoordinate(initialTarget);
    root.rotation.x = initialRotation.x;
    root.rotation.y = initialRotation.y;
    scene.add(root);

    const materials = createEarthMaterialSet(globeTheme);
    const earthGeometry = new THREE.SphereGeometry(1.42, 128, 128);
    const cloudsGeometry = new THREE.SphereGeometry(1.444, 128, 128);
    const atmosphereGeometry = new THREE.SphereGeometry(1.52, 96, 96);

    const earth = new THREE.Mesh(earthGeometry, materials.earth);
    const clouds = new THREE.Mesh(cloudsGeometry, materials.clouds);
    const atmosphere = new THREE.Mesh(atmosphereGeometry, materials.atmosphere);
    const marker = new THREE.Sprite(materials.marker);
    marker.scale.set(0.13, 0.13, 0.13);
    setVectorFromCoordinate(marker.position, initialTarget, 1.49);

    root.add(earth);
    root.add(clouds);
    root.add(marker);
    scene.add(atmosphere);

    const ambient = new THREE.AmbientLight(globeTheme === "dark" ? 0x99b7c7 : 0xccecef, 1.7);
    const sun = new THREE.DirectionalLight(0xffffff, globeTheme === "dark" ? 3.2 : 2.35);
    sun.position.set(-2.4, 1.8, 3.2);
    scene.add(ambient, sun);

    const pointer: PointerState = {
      isDragging: false,
      pointerId: null,
      previousX: 0,
      previousY: 0,
      previousTime: performance.now()
    };
    const rotationState: {
      target: GlobeRotation;
      velocityX: number;
      velocityY: number;
      focusUntil: number;
      interactionUntil: number;
      viewerMode: GlobeViewerMode;
    } = {
      target: initialRotation,
      velocityX: 0,
      velocityY: 0,
      focusUntil: performance.now() + 900,
      interactionUntil: 0,
      viewerMode: initialViewerMode
    };

    const resize = () => {
      if (disposed) return;
      const rect = mount.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    const queueResize = () => {
      if (resizeFrame !== undefined) {
        window.cancelAnimationFrame(resizeFrame);
      }
      resizeFrame = window.requestAnimationFrame(() => {
        resizeFrame = undefined;
        resize();
      });
    };

    const resizeObserver = "ResizeObserver" in window ? new ResizeObserver(queueResize) : null;
    resizeObserver?.observe(mount);
    resize();

    const setTarget = (coordinate: GlobeCoordinate, nextFlightId: number | null) => {
      rotationState.target = targetRotationForCoordinate(coordinate);
      setVectorFromCoordinate(marker.position, coordinate, 1.49);
      const now = performance.now();
      const isNewFlight = nextFlightId !== null && nextFlightId !== lastFlightIdRef.current;
      rotationState.focusUntil = now + (isNewFlight ? 4200 : 1800);
      rotationState.interactionUntil = now + (isNewFlight ? 3600 : 900);
      lastFlightIdRef.current = nextFlightId;
    };

    runtimeRef.current = {
      setViewerMode: (mode) => {
        rotationState.viewerMode = mode;
      },
      setTarget
    };

    const onPointerDown = (event: PointerEvent) => {
      if (rotationState.viewerMode !== "orbit-globe") return;
      pointer.isDragging = true;
      pointer.pointerId = event.pointerId;
      pointer.previousX = event.clientX;
      pointer.previousY = event.clientY;
      pointer.previousTime = event.timeStamp;
      rotationState.velocityX = 0;
      rotationState.velocityY = 0;
      rotationState.interactionUntil = performance.now() + 3600;
      renderer.domElement.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!pointer.isDragging || pointer.pointerId !== event.pointerId) return;
      const deltaX = event.clientX - pointer.previousX;
      const deltaY = event.clientY - pointer.previousY;
      const deltaSeconds = Math.max(0.016, (event.timeStamp - pointer.previousTime) / 1000);
      root.rotation.y += deltaX * 0.0062;
      root.rotation.x = clampOrbitTilt(root.rotation.x + deltaY * 0.0042);
      rotationState.velocityY = (deltaX * 0.0062) / deltaSeconds;
      rotationState.velocityX = (deltaY * 0.0042) / deltaSeconds;
      rotationState.target = { x: root.rotation.x, y: root.rotation.y };
      rotationState.focusUntil = 0;
      rotationState.interactionUntil = performance.now() + 4200;
      pointer.previousX = event.clientX;
      pointer.previousY = event.clientY;
      pointer.previousTime = event.timeStamp;
    };

    const stopPointerDrag = (event: PointerEvent) => {
      if (!pointer.isDragging || pointer.pointerId !== event.pointerId) return;
      pointer.isDragging = false;
      pointer.pointerId = null;
      rotationState.target = { x: root.rotation.x, y: root.rotation.y };
      rotationState.interactionUntil = performance.now() + 3200;
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
    };

    const onWheel = (event: WheelEvent) => {
      if (rotationState.viewerMode !== "orbit-globe") return;
      event.preventDefault();
      event.stopPropagation();
      rotationState.interactionUntil = performance.now() + 1800;
      onOrbitWheelZoomRef.current(event.deltaY);
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", stopPointerDrag);
    renderer.domElement.addEventListener("pointercancel", stopPointerDrag);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

    const clock = new THREE.Clock();
    const animate = () => {
      const deltaSeconds = Math.min(0.05, clock.getDelta());
      const now = performance.now();

      if (rotationState.viewerMode === "orbit-globe") {
        const focusDamping = now < rotationState.focusUntil ? 2.35 : 0.72;
        const blend = 1 - Math.exp(-focusDamping * deltaSeconds);
        root.rotation.y = lerpAngle(root.rotation.y, rotationState.target.y, blend);
        root.rotation.x = clampOrbitTilt(
          damp(root.rotation.x, rotationState.target.x, focusDamping, deltaSeconds)
        );

        if (!pointer.isDragging) {
          root.rotation.x = clampOrbitTilt(
            root.rotation.x + rotationState.velocityX * deltaSeconds
          );
          root.rotation.y += rotationState.velocityY * deltaSeconds;
          rotationState.velocityX *= Math.exp(-3.4 * deltaSeconds);
          rotationState.velocityY *= Math.exp(-3.4 * deltaSeconds);

          const shouldIdle =
            !reducedMotion &&
            now > rotationState.focusUntil &&
            now > rotationState.interactionUntil;
          if (shouldIdle) {
            rotationState.target.y += deltaSeconds * 0.032;
          }
        }
      }

      clouds.rotation.y += reducedMotion ? 0 : deltaSeconds * 0.018;
      atmosphere.rotation.y -= reducedMotion ? 0 : deltaSeconds * 0.004;
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(animate);
    };
    animate();
    setTarget(initialTarget, initialFlightId);

    return () => {
      disposed = true;
      runtimeRef.current = null;
      if (animationFrame !== undefined) window.cancelAnimationFrame(animationFrame);
      if (resizeFrame !== undefined) window.cancelAnimationFrame(resizeFrame);
      resizeObserver?.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", stopPointerDrag);
      renderer.domElement.removeEventListener("pointercancel", stopPointerDrag);
      renderer.domElement.removeEventListener("wheel", onWheel);
      mount.removeChild(renderer.domElement);
      earthGeometry.dispose();
      cloudsGeometry.dispose();
      atmosphereGeometry.dispose();
      disposeEarthMaterialSet(materials);
      renderer.dispose();
    };
  }, [globeTheme]);

  return (
    <div
      ref={mountRef}
      className={`vmesh-three-earth-layer absolute inset-[-2%] z-[14] transition-opacity duration-700 ${
        viewerMode === "orbit-globe"
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-0"
      }`}
    />
  );
}
