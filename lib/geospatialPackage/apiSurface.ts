export interface GeospatialMcpToolDescriptor {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    required: string[];
    properties: Record<string, unknown>;
  };
}

export const VMESH_GEOSPATIAL_PACKAGE_MCP_TOOLS: GeospatialMcpToolDescriptor[] = [
  {
    name: "vmesh.geospatial_package.list_sources",
    description:
      "List source-honest geospatial data candidates by layer, status, access class, artifact kind, and license gate.",
    inputSchema: {
      type: "object",
      required: [],
      properties: {
        layerId: {
          type: "string",
          description:
            "Optional layer filter such as terrain, imagery, roads, buildings, water, vegetation, parcels, climate, hydrology, contours, landcover, or field-boundaries."
        }
      }
    }
  },
  {
    name: "vmesh.geospatial_package.plan_package",
    description:
      "Plan an app-ready geospatial package for an AOI without downloading heavy data or exposing provider-specific logic to the consumer app.",
    inputSchema: {
      type: "object",
      required: ["aoi", "layers"],
      properties: {
        aoi: {
          type: "object",
          description: "AOI with h3Id, centroid, bounds, or a combination."
        },
        layers: {
          type: "array",
          items: { type: "string" },
          description: "Requested layer IDs."
        },
        preferredSourceIds: {
          type: "array",
          items: { type: "string" },
          description: "Optional provider preferences."
        },
        offline: {
          type: "boolean",
          description: "Prefer cacheable PMTiles/package-ready sources."
        }
      }
    }
  },
  {
    name: "vmesh.geospatial_package.plan_sentinel_sr",
    description:
      "Plan a cloud-gated Sentinel-2 L2A to SEN2SR 2.5 m imagery package and emit a downstream render texture handoff contract.",
    inputSchema: {
      type: "object",
      required: ["aoi"],
      properties: {
        aoi: {
          type: "object",
          description: "AOI with h3Id, centroid, bounds, or a combination."
        },
        consumerAppId: {
          type: "string",
          description: "Downstream app identifier, for example downstream-app."
        },
        sceneCloudCover: {
          type: "number",
          description: "Optional scene-level cloud percentage from Sentinel metadata."
        },
        clearPixelRatioAoi: {
          type: "number",
          description: "Optional AOI clear-pixel ratio after SCL mask validation."
        },
        sen2srPmtilesUrl: {
          type: "string",
          description: "Optional generated PMTiles URL after worker output is published."
        }
      }
    }
  },
  {
    name: "vmesh.geospatial_package.get_manifest",
    description:
      "Return a clean manifest reference for a planned package so downstream apps can consume URLs and provenance without provider branching.",
    inputSchema: {
      type: "object",
      required: ["packageId"],
      properties: {
        packageId: {
          type: "string",
          description: "Package id returned by plan_package."
        }
      }
    }
  }
];
