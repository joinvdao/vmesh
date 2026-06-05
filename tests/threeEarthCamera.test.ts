import { describe, expect, it } from "vitest";

import {
  clampLatitude,
  latLngToSpherePoint,
  lerpAngle,
  normalizeLongitude,
  targetRotationForCoordinate
} from "@/components/Map/threeEarthCamera";

describe("three earth camera math", () => {
  it("normalizes coordinates into globe-safe ranges", () => {
    expect(normalizeLongitude(190)).toBe(-170);
    expect(normalizeLongitude(-190)).toBe(170);
    expect(clampLatitude(96)).toBe(89.8);
    expect(clampLatitude(-96)).toBe(-89.8);
  });

  it("places longitude zero on the camera-facing side of the sphere", () => {
    const point = latLngToSpherePoint({ latitude: 0, longitude: 0 }, 2);
    expect(point.x).toBeCloseTo(0, 5);
    expect(point.y).toBeCloseTo(0, 5);
    expect(point.z).toBeCloseTo(2, 5);
  });

  it("derives stable target rotations for searched coordinates", () => {
    const lisbon = targetRotationForCoordinate({ latitude: 38.7223, longitude: -9.1393 });
    const perthshire = targetRotationForCoordinate({ latitude: 56.395, longitude: -3.43 });
    expect(lisbon.x).toBeGreaterThan(0);
    expect(lisbon.y).toBeGreaterThan(0);
    expect(perthshire.x).toBeGreaterThan(lisbon.x);
  });

  it("interpolates across the anti-meridian by the shortest path", () => {
    const start = Math.PI - 0.08;
    const target = -Math.PI + 0.08;
    expect(lerpAngle(start, target, 0.5)).toBeGreaterThan(Math.PI - 0.09);
  });
});
