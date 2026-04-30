import type { MacroPillars } from "@/lib/vmeshTypes";

export type RgbColor = [number, number, number];

const LOW_COLOR: RgbColor = [232, 194, 111];
const MID_COLOR: RgbColor = [51, 151, 146];
const HIGH_COLOR: RgbColor = [165, 230, 203];

export function clampScore(score: number): number {
  return Math.min(100, Math.max(0, Math.round(score)));
}

export function interpolateRgb(start: RgbColor, end: RgbColor, t: number): RgbColor {
  const safeT = Math.min(1, Math.max(0, t));
  return [
    Math.round(start[0] + (end[0] - start[0]) * safeT),
    Math.round(start[1] + (end[1] - start[1]) * safeT),
    Math.round(start[2] + (end[2] - start[2]) * safeT)
  ];
}

export function getAntifragilityColor(score: number): RgbColor {
  const normalized = clampScore(score) / 100;
  if (normalized < 0.5) {
    return interpolateRgb(LOW_COLOR, MID_COLOR, normalized * 2);
  }
  return interpolateRgb(MID_COLOR, HIGH_COLOR, (normalized - 0.5) * 2);
}

export function getScoreStatus(score: number): string {
  const safeScore = clampScore(score);
  if (safeScore >= 78) return "Very High Antifragility";
  if (safeScore >= 66) return "High Antifragility";
  if (safeScore >= 50) return "Adaptive";
  if (safeScore >= 34) return "Watch";
  return "Fragile";
}

export function computeAntifragilityScore(pillars: MacroPillars): number {
  const constructive =
    pillars.climate * 0.18 +
    pillars.energy * 0.16 +
    pillars.water * 0.16 +
    pillars.infrastructure * 0.16 +
    pillars.biodiversity * 0.18;
  const invertedRisk = (100 - pillars.risk) * 0.16;
  return clampScore(constructive + invertedRisk);
}

export function formatScore(score: number): string {
  return `${clampScore(score)}/100`;
}
