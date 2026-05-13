import type { DataProvenance } from "@/lib/types/core";

export type HubPlaybookDimension =
  | "water"
  | "food"
  | "power"
  | "comms"
  | "access"
  | "shelter"
  | "tools"
  | "governance";

export interface HubPlaybookTask {
  id: string;
  h3Id: string;
  dimension: HubPlaybookDimension;
  title: string;
  phase: "assess" | "stabilize" | "build" | "operate";
  complete: boolean;
  notes: string;
}

export interface HubPlaybookState {
  active: boolean;
  selectedH3Id: string;
  readinessScore: number;
  tasks: HubPlaybookTask[];
  updatedAt: string;
}

export type NetworkNodeStatus = "offline" | "local-only" | "bridge-connected" | "degraded";

export interface ReticulumGatewayStatus {
  status: NetworkNodeStatus;
  reachablePeers: number;
  queuedMessages: number;
  notes: string;
}

export interface MeshtasticBridgeStatus {
  status: NetworkNodeStatus;
  connectedNode: string;
  radioPath: "mock" | "serial" | "ble" | "tcp" | "mqtt";
  notes: string;
}

export interface LocalLlmStatus {
  status: NetworkNodeStatus;
  endpoint: string;
  modelLabel: string;
  notes: string;
}

export interface HubNodeStatus {
  reticulum: ReticulumGatewayStatus;
  meshtastic: MeshtasticBridgeStatus;
  localLlm: LocalLlmStatus;
  lanMode: "offline-ready" | "online-assisted";
  updatedAt: string;
}

export interface HubMessageEnvelope {
  id: string;
  h3Id: string;
  timestamp: string;
  priority: "routine" | "important" | "urgent";
  payloadType: "check-in" | "cell-status" | "hazard" | "need-offer" | "resource-report";
  payload: string;
  signaturePlaceholder: string;
  provenance: DataProvenance;
}
