import { describe, expect, it, vi } from "vitest";

import {
  queryOpenMeteoCurrent,
  querySoilGridsSurface
} from "@/lib/geospatialPackage/typedPointContext";

describe("typed point context adapters", () => {
  it("preserves weather units and modelled role", async () => {
    const result = await queryOpenMeteoCurrent(50, -120, {
      fetchImpl: vi.fn(async () =>
        Response.json({
          elevation: 400,
          current_units: { temperature_2m: "C", precipitation: "mm", wind_speed_10m: "km/h" },
          current: {
            time: "2026-07-11T00:00",
            temperature_2m: 20,
            precipitation: 0,
            weather_code: 1,
            wind_speed_10m: 5
          }
        })
      )
    });
    expect(result).toMatchObject({
      status: "query-succeeded",
      role: "modelled-current-weather-context",
      policy: { maxAttempts: 2, cacheTtlSeconds: 900 },
      units: { precipitation: "mm" },
      values: { temperature2m: 20 }
    });
  });

  it("treats null SoilGrids values as valid no-data", async () => {
    const result = await querySoilGridsSurface(50, -120, {
      fetchImpl: vi.fn(async () =>
        Response.json({
          properties: {
            layers: [
              {
                name: "clay",
                unit_measure: { target_units: "%" },
                depths: [{ values: { mean: null } }]
              }
            ]
          }
        })
      )
    });
    expect(result).toMatchObject({
      status: "query-succeeded-no-data",
      role: "modelled-global-soil-context",
      values: { clayMean0To5cm: null }
    });
  });

  it("keeps provider failures explicit", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 503 }));
    const result = await queryOpenMeteoCurrent(50, -120, {
      fetchImpl
    });
    expect(result.status).toBe("provider-failed");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
