import { makeRng } from './prng';

function lmap(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

export interface LayerPositions {
  positions: number[];
  gaps: number[];
  depthLabels: string[];
  totalHeight: number;
  topOffset: number;
}

export function calculateLayerPositions(
  numLayers: number,
  depth: number,
  tension: number,
  seed: number,
  canvasH: number,
): LayerPositions {
  const tensionHeight = canvasH * lmap(tension, 1, 10, 0.25, 0.88);
  const topOffset = (canvasH - tensionHeight) * 0.4;

  const BASE_GAP = tensionHeight / Math.max(numLayers - 1, 1);

  const rng = makeRng(seed ^ 0xdeadbeef);

  const rawGaps: number[] = [];
  for (let i = 0; i < numLayers - 1; i++) {
    const depthMult = 1 + (depth - 1) * (i / Math.max(numLayers - 1, 1)) * 0.4;
    const randMult = rng.range(0.7, 1.3);
    rawGaps.push(BASE_GAP * depthMult * randMult);
  }

  // Normalize so sum = tensionHeight
  const rawSum = rawGaps.reduce((a, b) => a + b, 0);
  const scale = rawSum > 0 ? tensionHeight / rawSum : 1;
  const gaps = rawGaps.map((g) => g * scale);

  const positions: number[] = [topOffset];
  for (let i = 1; i < numLayers; i++) {
    positions.push(positions[i - 1] + gaps[i - 1]);
  }

  // Depth labels: 0.0M at top, 12.0M at bottom
  const depthLabels: string[] = positions.map((pos) => {
    const frac = (pos - topOffset) / Math.max(tensionHeight, 1);
    const meters = frac * 12.0;
    return `— ${meters.toFixed(1)} M`;
  });

  return { positions, gaps, depthLabels, totalHeight: tensionHeight, topOffset };
}

// Stroke weight for layer/zone index i out of `count` total, given thickness and variable taper.
// index=0 = surface (thin end), index=count-1 = core (thick end).
// base(thickness=1) ≈ 0.5px, base(thickness=10) = 4.0px.
// Variable taper: 1× at surface → 3× at core.
export function strokeWeightAt(
  index: number,
  count: number,
  thickness: number,
  variable: boolean,
): number {
  const base = lmap(thickness, 1, 10, 0.5, 4.0);
  if (!variable || count <= 1) return base;
  const t = index / (count - 1);
  return base * (1 + t * 2);
}
