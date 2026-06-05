import { NextRequest, NextResponse } from "next/server";

import {
  getGeospatialSourceRegistry,
  getPackageSourcesByLayer,
  redactSourceCandidate,
  type PackageLayerId
} from "@/lib/geospatialPackage";

export const dynamic = "force-dynamic";

function isPackageLayerId(value: string): value is PackageLayerId {
  return [
    "terrain",
    "imagery",
    "roads",
    "buildings",
    "water",
    "vegetation",
    "parcels",
    "climate",
    "hydrology",
    "contours",
    "landcover",
    "field-boundaries"
  ].includes(value);
}

function isMapboxConfigured() {
  return Boolean(process.env.MAPBOX_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN);
}

export async function GET(req: NextRequest) {
  const sources = getGeospatialSourceRegistry({
    basemapPmtilesUrl: process.env.NEXT_PUBLIC_BASEMAP_PMTILES_URL,
    mapterhornPmtilesUrl: process.env.NEXT_PUBLIC_MAPTERHORN_PMTILES_URL,
    mapzenTerrariumUrl: process.env.NEXT_PUBLIC_MAPZEN_TERRARIUM_URL,
    sen2srPmtilesUrl: process.env.NEXT_PUBLIC_SEN2SR_PMTILES_URL,
    mapboxConfigured: isMapboxConfigured()
  });
  const layer = req.nextUrl.searchParams.get("layer");
  const filteredSources =
    layer && isPackageLayerId(layer) ? getPackageSourcesByLayer(sources, layer) : sources;
  const publicSources = filteredSources.map(redactSourceCandidate);

  return NextResponse.json(
    {
      schemaVersion: "vmesh-geospatial-source-registry-v1",
      count: publicSources.length,
      layer: layer && isPackageLayerId(layer) ? layer : null,
      sources: publicSources
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      }
    }
  );
}
