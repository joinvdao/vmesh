import { describe, expect, it } from "vitest";

import { normalizeCoverageEvidenceEndpointRefs } from "../lib/sourceRegistryIngest";

describe("normalizeCoverageEvidenceEndpointRefs", () => {
  it("retains a canonical endpoint relation when the endpoint exists", () => {
    expect(
      normalizeCoverageEvidenceEndpointRefs(
        [{ id: "coverage-1", endpointId: "endpoint-1" }],
        ["endpoint-1"]
      )
    ).toEqual([
      {
        id: "coverage-1",
        endpointId: "endpoint-1",
        reportedEndpointId: "endpoint-1"
      }
    ]);
  });

  it("preserves an unresolved probe id without creating a false relation", () => {
    expect(
      normalizeCoverageEvidenceEndpointRefs(
        [{ id: "coverage-1", endpointId: "probe-endpoint-1" }],
        ["endpoint-1"]
      )
    ).toEqual([
      {
        id: "coverage-1",
        endpointId: null,
        reportedEndpointId: "probe-endpoint-1"
      }
    ]);
  });

  it("keeps absent endpoint ids explicitly null", () => {
    expect(normalizeCoverageEvidenceEndpointRefs([{ id: "coverage-1" }], [])).toEqual([
      { id: "coverage-1", endpointId: null, reportedEndpointId: null }
    ]);
  });

  it("preserves an exporter-supplied unresolved probe reference", () => {
    expect(
      normalizeCoverageEvidenceEndpointRefs(
        [{ id: "coverage-1", endpointId: null, reportedEndpointId: "probe-endpoint-1" }],
        []
      )
    ).toEqual([
      {
        id: "coverage-1",
        endpointId: null,
        reportedEndpointId: "probe-endpoint-1"
      }
    ]);
  });
});
