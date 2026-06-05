export interface GlobeCoordinate {
  latitude: number;
  longitude: number;
}

export interface SpherePoint {
  x: number;
  y: number;
  z: number;
}

export interface GlobeRotation {
  x: number;
  y: number;
}

const HALF_PI = Math.PI / 2;
const TWO_PI = Math.PI * 2;

export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function normalizeLongitude(longitude: number): number {
  const normalized = ((((longitude + 180) % 360) + 360) % 360) - 180;
  return Object.is(normalized, -180) ? 180 : normalized;
}

export function clampLatitude(latitude: number): number {
  return Math.min(89.8, Math.max(-89.8, latitude));
}

export function latLngToSpherePoint(
  { latitude, longitude }: GlobeCoordinate,
  radius = 1
): SpherePoint {
  const lat = degToRad(clampLatitude(latitude));
  const lng = degToRad(normalizeLongitude(longitude));
  const cosLat = Math.cos(lat);

  return {
    x: radius * cosLat * Math.sin(lng),
    y: radius * Math.sin(lat),
    z: radius * cosLat * Math.cos(lng)
  };
}

export function targetRotationForCoordinate(coordinate: GlobeCoordinate): GlobeRotation {
  return {
    x: Math.min(1.22, Math.max(-1.22, degToRad(clampLatitude(coordinate.latitude)))),
    y: -degToRad(normalizeLongitude(coordinate.longitude))
  };
}

export function normalizeRadians(radians: number): number {
  return ((((radians + Math.PI) % TWO_PI) + TWO_PI) % TWO_PI) - Math.PI;
}

export function lerpAngle(current: number, target: number, amount: number): number {
  return current + normalizeRadians(target - current) * amount;
}

export function damp(
  current: number,
  target: number,
  damping: number,
  deltaSeconds: number
): number {
  return current + (target - current) * (1 - Math.exp(-damping * deltaSeconds));
}

export function clampOrbitTilt(radians: number): number {
  return Math.min(HALF_PI * 0.78, Math.max(-HALF_PI * 0.78, radians));
}
