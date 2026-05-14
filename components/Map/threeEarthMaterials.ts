import * as THREE from "three";

import {
  BLUE_MARBLE_TEXTURE_PATH,
  createProceduralBumpCanvas,
  createProceduralCloudCanvas,
  createProceduralEarthCanvas
} from "@/components/Map/earthTextureSources";
import type { GlobeTheme } from "@/lib/vmeshTypes";

export interface EarthMaterialSet {
  earth: THREE.MeshPhongMaterial;
  clouds: THREE.MeshLambertMaterial;
  atmosphere: THREE.ShaderMaterial;
  marker: THREE.SpriteMaterial;
  textures: THREE.Texture[];
  cancelTextureLoads: () => void;
}

function configureTexture(texture: THREE.Texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
}

function loadBlueMarbleTexture(
  earth: THREE.MeshPhongMaterial,
  textures: THREE.Texture[]
): () => void {
  const loader = new THREE.TextureLoader();
  let cancelled = false;

  loader.load(
    BLUE_MARBLE_TEXTURE_PATH,
    (texture) => {
      if (cancelled) {
        texture.dispose();
        return;
      }
      configureTexture(texture);
      texture.name = "NASA Blue Marble 2048";
      textures.push(texture);
      earth.map = texture;
      earth.bumpScale = 0.018;
      earth.needsUpdate = true;
    },
    undefined,
    () => {
      // The procedural canvas texture remains active as a local fallback.
    }
  );

  return () => {
    cancelled = true;
  };
}

function createMarkerTexture(theme: GlobeTheme): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (context) {
    context.clearRect(0, 0, 128, 128);
    const glow = context.createRadialGradient(64, 64, 0, 64, 64, 56);
    glow.addColorStop(0, theme === "dark" ? "rgba(94,234,212,0.46)" : "rgba(15,118,110,0.32)");
    glow.addColorStop(1, "rgba(15,118,110,0)");
    context.fillStyle = glow;
    context.beginPath();
    context.arc(64, 64, 56, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = theme === "dark" ? "rgba(208,250,241,0.92)" : "rgba(10,101,95,0.9)";
    context.lineWidth = 7;
    context.beginPath();
    context.arc(64, 64, 18, 0, Math.PI * 2);
    context.stroke();

    context.fillStyle = theme === "dark" ? "#5eead4" : "#0f766e";
    context.beginPath();
    context.arc(64, 64, 9, 0, Math.PI * 2);
    context.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  configureTexture(texture);
  return texture;
}

export function createEarthMaterialSet(theme: GlobeTheme): EarthMaterialSet {
  const surfaceTexture = new THREE.CanvasTexture(createProceduralEarthCanvas(theme));
  const bumpTexture = new THREE.CanvasTexture(createProceduralBumpCanvas(theme));
  const cloudTexture = new THREE.CanvasTexture(createProceduralCloudCanvas(theme));
  const markerTexture = createMarkerTexture(theme);

  configureTexture(surfaceTexture);
  configureTexture(bumpTexture);
  configureTexture(cloudTexture);

  const earth = new THREE.MeshPhongMaterial({
    map: surfaceTexture,
    bumpMap: bumpTexture,
    bumpScale: theme === "dark" ? 0.032 : 0.024,
    color: theme === "dark" ? new THREE.Color("#d6f1ec") : new THREE.Color("#ffffff"),
    shininess: theme === "dark" ? 52 : 42,
    specular: theme === "dark" ? new THREE.Color("#406f7b") : new THREE.Color("#6fa5ac")
  });

  const clouds = new THREE.MeshLambertMaterial({
    map: cloudTexture,
    transparent: true,
    opacity: theme === "dark" ? 0.08 : 0.06,
    depthWrite: false,
    blending: THREE.NormalBlending
  });

  const atmosphere = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      glowColor: {
        value: new THREE.Color(theme === "dark" ? "#4dbce7" : "#62c1cf")
      },
      intensity: {
        value: theme === "dark" ? 0.52 : 0.32
      }
    },
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      uniform float intensity;
      varying vec3 vNormal;
      void main() {
        float rim = pow(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
        gl_FragColor = vec4(glowColor, max(0.0, rim) * intensity);
      }
    `
  });

  const marker = new THREE.SpriteMaterial({
    map: markerTexture,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    opacity: 0.95
  });

  const textures = [surfaceTexture, bumpTexture, cloudTexture, markerTexture];
  const cancelTextureLoads = loadBlueMarbleTexture(earth, textures);

  return {
    earth,
    clouds,
    atmosphere,
    marker,
    textures,
    cancelTextureLoads
  };
}

export function disposeEarthMaterialSet(materials: EarthMaterialSet) {
  materials.cancelTextureLoads();
  materials.earth.dispose();
  materials.clouds.dispose();
  materials.atmosphere.dispose();
  materials.marker.dispose();
  for (const texture of materials.textures) {
    texture.dispose();
  }
}
