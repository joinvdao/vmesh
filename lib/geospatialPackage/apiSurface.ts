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
            "Optional layer filter such as terrain, imagery, roads, buildings, water, vegetation, ecology, soil, parcels, climate, hydrology, contours, landcover, or field-boundaries."
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
    name: "vmesh.geospatial_package.plan_ba_geospatial_package",
    description:
      "Return a reviewed BA-facing geospatial source package with STAC-like source refs, typed source records, fetch recipes, live-proof refs, warnings, and gaps.",
    inputSchema: {
      type: "object",
      required: ["aoi"],
      properties: {
        aoi: {
          type: "object",
          description: "AOI with h3Id, centroid, bounds, or a combination."
        },
        segments: {
          type: "array",
          items: { type: "string" },
          description:
            "Reviewed BA geospatial segments such as terrain_elevation, imagery_observation, water_hydrology, access_infrastructure, land_property_planning, soils_landcover, and climate_weather."
        },
        consumerAppId: {
          type: "string",
          description: "Downstream app identifier, normally ba-gis-worker."
        }
      }
    }
  },
  {
    name: "vmesh.geospatial_package.plan_ba_ecosystem_package",
    description:
      "Return a reviewed BA-facing ecosystem package with typed ecological records, source refs, knowledge handoffs, display modes, warnings, and gaps.",
    inputSchema: {
      type: "object",
      required: ["aoi"],
      properties: {
        aoi: {
          type: "object",
          description: "AOI with h3Id, centroid, bounds, or a combination."
        },
        segments: {
          type: "array",
          items: { type: "string" },
          description:
            "Ecosystem segments such as ecology_biodiversity_carbon, soils_landcover, water_hydrology, climate_weather, agriculture_operations, community_economy, and research_only."
        },
        consumerAppId: {
          type: "string",
          description: "Downstream app identifier, normally ba-gis-worker."
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
    name: "vmesh.geospatial_package.plan_building_package",
    description:
      "Plan an Overture-first source-backed building footprint worker handoff for an AOI without claiming a completed global building index.",
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
        preferredSourceIds: {
          type: "array",
          items: { type: "string" },
          description:
            "Optional building source preferences; only the first selectable source can become primary."
        },
        offline: {
          type: "boolean",
          description: "Prefer cacheable/package-ready building sources."
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
  },
  {
    name: "vmesh.geospatial_package.list_intel_broker_sources",
    description:
      "List Intel Tools-derived, VMesh-processed source broker records for BA by ecosystem/geospatial segment, review status, and golden evaluation site.",
    inputSchema: {
      type: "object",
      required: [],
      properties: {
        segment: {
          type: "string",
          description:
            "Optional source-broker segment such as terrain_elevation, soils_landcover, climate_weather, agriculture_operations, community_economy, or operator_review."
        },
        site: {
          type: "string",
          description: "Optional evaluation site id such as kamloops-rose or alberta-golden."
        },
        includeLicenseReview: {
          type: "boolean",
          description:
            "Include machine-readable source refs that are useful to BA but still need license/access review."
        }
      }
    }
  }
];
