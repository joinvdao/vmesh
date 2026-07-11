export type CoverageEvidenceEndpointRef = {
  [key: string]: unknown;
  endpointId?: string | null;
  reportedEndpointId?: string | null;
};

export function normalizeCoverageEvidenceEndpointRefs<T extends CoverageEvidenceEndpointRef>(
  rows: readonly T[],
  endpointIds: Iterable<string>
) {
  const knownEndpointIds = new Set(endpointIds);
  return rows.map((row) => {
    const reportedEndpointId = row.reportedEndpointId || row.endpointId || null;
    return {
      ...row,
      reportedEndpointId,
      endpointId:
        reportedEndpointId && knownEndpointIds.has(reportedEndpointId) ? reportedEndpointId : null
    };
  });
}
