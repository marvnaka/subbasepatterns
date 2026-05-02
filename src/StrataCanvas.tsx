import React, { useMemo } from 'react';
import type { StrataConfig } from './types';
import { calculateLayerPositions, strokeWeightAt } from './composition';
import { renderZonePattern } from './patterns';

interface StrataCanvasProps {
  config: StrataConfig;
  canvasWidth: number;
  canvasHeight: number;
}

function lmap(v: number, i0: number, i1: number, o0: number, o1: number) {
  return o0 + ((v - i0) / (i1 - i0)) * (o1 - o0);
}

export const StrataCanvas = React.forwardRef<SVGSVGElement, StrataCanvasProps>(
  ({ config, canvasWidth, canvasHeight }, ref) => {
    const {
      seed, density, lineOpacity, thickness, variableWeight,
      patternAssignment, showDepthNumbers, accentLayerEnabled, accentLayerIndex,
      layers, depth, tension,
    } = config;

    const illWidth = canvasWidth * 0.72;
    const illX = (canvasWidth - illWidth) / 2;
    const opacity = lineOpacity / 100;
    const numZones = layers - 1;

    const { positions, depthLabels } = useMemo(
      () => calculateLayerPositions(layers, depth, tension, seed, canvasHeight),
      [layers, depth, tension, seed, canvasHeight],
    );

    const patternElements: React.ReactElement[] = [];
    const lineElements: React.ReactElement[] = [];
    const labelElements: React.ReactElement[] = [];

    for (let i = 0; i < positions.length - 1; i++) {
      const y = positions[i];
      const nextY = positions[i + 1];
      const zoneH = nextY - y;
      const isCore = i === numZones - 1;
      const zoneWeight = strokeWeightAt(i, numZones, thickness, variableWeight);
      const patternType = patternAssignment[i] ?? 'EMPTY';

      const zoneEl = renderZonePattern({
        id: `zone-${seed}-${i}`,
        type: patternType,
        density,
        weight: zoneWeight,
        x: illX,
        y,
        width: illWidth,
        height: zoneH,
        seed: seed ^ (i * 0x1a2b3c4d),
        isCore,
      });
      if (zoneEl) patternElements.push(zoneEl);
    }

    for (let i = 0; i < positions.length; i++) {
      const y = positions[i];
      const isAccent = accentLayerEnabled && i === accentLayerIndex;
      const lineWeight = strokeWeightAt(i, layers, thickness, variableWeight);
      const strokeWidth = isAccent ? Math.max(lineWeight + 0.5, 1) : lineWeight;
      const strokeColor = isAccent ? '#E8E0D0' : '#FFFFFF';

      lineElements.push(
        <line key={`line-${i}`} x1={illX} y1={y} x2={illX + illWidth} y2={y}
          stroke={strokeColor} strokeWidth={strokeWidth} />,
      );

      if (showDepthNumbers) {
        labelElements.push(
          <text key={`label-${i}`} x={illX - 8} y={y + 0.5}
            textAnchor="end" dominantBaseline="middle"
            fontFamily="'Inter Mono', monospace" fontSize={7} fill="#FFFFFF" opacity={0.25}>
            {depthLabels[i]}
          </text>,
        );
      }
    }

    return (
      <svg ref={ref} xmlns="http://www.w3.org/2000/svg"
        width={canvasWidth} height={canvasHeight} style={{ display: 'block' }}>
        <rect width={canvasWidth} height={canvasHeight} fill="#050505" />
        <g opacity={opacity}>
          {patternElements}
          {lineElements}
        </g>
        {labelElements}
      </svg>
    );
  },
);

StrataCanvas.displayName = 'StrataCanvas';

// ── String export ─────────────────────────────────────────────────────────
// Uses explicit elements + clipPath rects instead of SVG <pattern> to ensure
// reliable rendering across all SVG viewers and export environments.

export function exportSVGString(
  config: StrataConfig,
  canvasWidth: number,
  canvasHeight: number,
): string {
  const {
    seed, density, lineOpacity, thickness, variableWeight,
    patternAssignment, showDepthNumbers, accentLayerEnabled, accentLayerIndex,
    layers, depth, tension,
  } = config;

  const illWidth = canvasWidth * 0.72;
  const illX = (canvasWidth - illWidth) / 2;
  const opacity = lineOpacity / 100;
  const numZones = layers - 1;

  const { positions, depthLabels } = calculateLayerPositions(layers, depth, tension, seed, canvasHeight);

  let defs = '';
  let patBody = '';
  let lineBody = '';
  let labelBody = '';

  for (let i = 0; i < positions.length - 1; i++) {
    const y = positions[i];
    const nextY = positions[i + 1];
    const zoneH = nextY - y;
    const isCore = i === numZones - 1;
    const effectiveDensity = isCore ? Math.min(density * 1.5, 10) : density;
    const patternType = patternAssignment[i] ?? 'EMPTY';
    const zoneWeight = strokeWeightAt(i, numZones, thickness, variableWeight);
    
    const clipId = `clip-2d-${seed}-${i}`;

    if (patternType === 'EMPTY') continue;

    // One clipPath per zone — a simple rect clipping to the zone bounds.
    defs += `<clipPath id="${clipId}"><rect x="${illX.toFixed(2)}" y="${y.toFixed(2)}" width="${illWidth.toFixed(2)}" height="${zoneH.toFixed(2)}"/></clipPath>`;

    let fill = '';

    if (patternType === 'DOTS') {
      const sp = Math.max(lmap(effectiveDensity, 1, 10, 20, 3), 1);
      const r = Math.max(zoneWeight * 0.45, 0.3);
      let circles = '';
      // Generate grid with slight overlap past zone edges so clip produces clean coverage.
      for (let cx = illX; cx <= illX + illWidth + sp; cx += sp) {
        for (let cy = y; cy <= y + zoneH + sp; cy += sp) {
          circles += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(2)}" fill="#FFFFFF"/>`;
        }
      }
      fill = circles;
    } else if (patternType === 'DIAGONAL') {
      const sp = Math.max(lmap(effectiveDensity, 1, 10, 30, 4), 1.5);
      const sw = Math.max(zoneWeight * 0.55, 0.3);
      let lines = '';
      // 45° lines: from (x0, y+zoneH) to (x0+zoneH, y) — covers full zone width when clipped.
      for (let x0 = illX - zoneH; x0 < illX + illWidth + sp; x0 += sp) {
        lines += `<line x1="${x0.toFixed(1)}" y1="${(y + zoneH).toFixed(1)}" x2="${(x0 + zoneH).toFixed(1)}" y2="${y.toFixed(1)}" stroke="#FFFFFF" stroke-width="${sw.toFixed(2)}"/>`;
      }
      fill = lines;
    } else if (patternType === 'CROSS-HATCH') {
      const sp = Math.max(lmap(effectiveDensity, 1, 10, 30, 4), 1.5);
      const sw = Math.max(zoneWeight * 0.55, 0.3);
      let lines = '';
      // 45° lines (bottom-left to top-right)
      for (let x0 = illX - zoneH; x0 < illX + illWidth + sp; x0 += sp) {
        lines += `<line x1="${x0.toFixed(1)}" y1="${(y + zoneH).toFixed(1)}" x2="${(x0 + zoneH).toFixed(1)}" y2="${y.toFixed(1)}" stroke="#FFFFFF" stroke-width="${sw.toFixed(2)}"/>`;
      }
      // 135° lines (top-left to bottom-right)
      for (let x0 = illX - zoneH; x0 < illX + illWidth + sp; x0 += sp) {
        lines += `<line x1="${x0.toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x0 + zoneH).toFixed(1)}" y2="${(y + zoneH).toFixed(1)}" stroke="#FFFFFF" stroke-width="${sw.toFixed(2)}"/>`;
      }
      fill = lines;
    } else if (patternType === 'WOVEN') {
      const sp = Math.max(lmap(effectiveDensity, 1, 10, 8, 1), 0.5);
      const sw = Math.max(zoneWeight * 0.45, 0.25);
      let lines = '';
      for (let cy = y + sp; cy < y + zoneH; cy += sp) {
        lines += `<line x1="${illX.toFixed(2)}" y1="${cy.toFixed(2)}" x2="${(illX + illWidth).toFixed(2)}" y2="${cy.toFixed(2)}" stroke="#FFFFFF" stroke-width="${sw.toFixed(2)}"/>`;
      }
      // WOVEN lines are already within zone bounds — no clip needed.
      patBody += lines;
      continue;
    }

    patBody += `<g clip-path="url(#${clipId})">${fill}</g>`;
  }

  for (let i = 0; i < positions.length; i++) {
    const y = positions[i];
    const isAccent = accentLayerEnabled && i === accentLayerIndex;
    const lineWeight = strokeWeightAt(i, layers, thickness, variableWeight);
    const sw = isAccent ? Math.max(lineWeight + 0.5, 1) : lineWeight;
    const stroke = isAccent ? '#E8E0D0' : '#FFFFFF';
    lineBody += `<line x1="${illX.toFixed(2)}" y1="${y.toFixed(2)}" x2="${(illX + illWidth).toFixed(2)}" y2="${y.toFixed(2)}" stroke="${stroke}" stroke-width="${sw.toFixed(2)}"/>`;

    if (showDepthNumbers) {
      labelBody += `<text x="${(illX - 8).toFixed(1)}" y="${(y + 0.5).toFixed(1)}" text-anchor="end" dominant-baseline="middle" font-family="'Inter Mono', monospace" font-size="7" fill="#FFFFFF" opacity="0.25">${depthLabels[i]}</text>`;
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}">
  <rect width="${canvasWidth}" height="${canvasHeight}" fill="none"/>
  <defs>${defs}</defs>
  <g opacity="${opacity}">
    ${patBody}
    ${lineBody}
  </g>
  ${labelBody}
</svg>`;
}
