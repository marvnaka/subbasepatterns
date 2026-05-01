import React, { useMemo } from 'react';
import type { StrataConfig } from './types';
import { calculateLayerPositions } from './composition';
import { renderZonePattern } from './patterns';
import { makeRng } from './prng';

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
      seed,
      density,
      lineOpacity,
      patternAssignment,
      showDepthNumbers,
      accentLayerEnabled,
      accentLayerIndex,
      layers,
      depth,
      tension,
    } = config;

    const illWidth = canvasWidth * 0.72;
    const illX = (canvasWidth - illWidth) / 2;
    const opacity = lineOpacity / 100;

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
      const isCore = i === positions.length - 2;
      const patternType = patternAssignment[i] ?? 'EMPTY';

      const zoneEl = renderZonePattern({
        id: `zone-${seed}-${i}`,
        type: patternType,
        density,
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
      const strokeColor = isAccent ? '#E8E0D0' : '#FFFFFF';
      const strokeWidth = isAccent ? 1 : 0.5;

      lineElements.push(
        <line
          key={`line-${i}`}
          x1={illX}
          y1={y}
          x2={illX + illWidth}
          y2={y}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />,
      );

      if (showDepthNumbers) {
        labelElements.push(
          <text
            key={`label-${i}`}
            x={illX - 8}
            y={y + 0.5}
            textAnchor="end"
            dominantBaseline="middle"
            fontFamily="'Inter Mono', monospace"
            fontSize={7}
            fill="#FFFFFF"
            opacity={0.25}
          >
            {depthLabels[i]}
          </text>,
        );
      }
    }

    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={canvasWidth}
        height={canvasHeight}
        style={{ display: 'block' }}
      >
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

export function exportSVGString(config: StrataConfig, canvasWidth: number, canvasHeight: number): string {
  const {
    seed,
    density,
    lineOpacity,
    patternAssignment,
    showDepthNumbers,
    accentLayerEnabled,
    accentLayerIndex,
    layers,
    depth,
    tension,
  } = config;

  const illWidth = canvasWidth * 0.72;
  const illX = (canvasWidth - illWidth) / 2;
  const opacity = lineOpacity / 100;

  const { positions, depthLabels } = calculateLayerPositions(layers, depth, tension, seed, canvasHeight);

  let patDefs = '';
  let patBody = '';
  let lineBody = '';
  let labelBody = '';

  for (let i = 0; i < positions.length - 1; i++) {
    const y = positions[i];
    const nextY = positions[i + 1];
    const zoneH = nextY - y;
    const isCore = i === positions.length - 2;
    const effectiveDensity = isCore ? Math.min(density * 1.5, 10) : density;
    const patternType = patternAssignment[i] ?? 'EMPTY';
    const zoneSeed = seed ^ (i * 0x1a2b3c4d);
    const patId = `pat-zone-${i}`;

    if (patternType === 'DOTS') {
      const spacing = Math.max(lmap(effectiveDensity, 1, 10, 20, 3), 1);
      patDefs += `<pattern id="${patId}" x="${illX}" y="${y}" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse"><circle cx="${(spacing / 2).toFixed(2)}" cy="${(spacing / 2).toFixed(2)}" r="0.4" fill="#FFFFFF"/></pattern>`;
      patBody += `<rect x="${illX.toFixed(2)}" y="${y.toFixed(2)}" width="${illWidth.toFixed(2)}" height="${zoneH.toFixed(2)}" fill="url(#${patId})"/>`;
    } else if (patternType === 'STIPPLE') {
      const spacing = Math.max(lmap(effectiveDensity, 1, 10, 20, 4), 2);
      const rowH = spacing * Math.sqrt(3) / 2;
      const r = Math.max(spacing * 0.18, 0.4);
      patDefs += `<pattern id="${patId}" x="${illX.toFixed(2)}" y="${y.toFixed(2)}" width="${spacing.toFixed(2)}" height="${(rowH * 2).toFixed(2)}" patternUnits="userSpaceOnUse"><circle cx="0" cy="0" r="${r.toFixed(2)}" fill="#FFFFFF"/><circle cx="${spacing.toFixed(2)}" cy="0" r="${r.toFixed(2)}" fill="#FFFFFF"/><circle cx="${(spacing / 2).toFixed(2)}" cy="${rowH.toFixed(2)}" r="${r.toFixed(2)}" fill="#FFFFFF"/><circle cx="0" cy="${(rowH * 2).toFixed(2)}" r="${r.toFixed(2)}" fill="#FFFFFF"/><circle cx="${spacing.toFixed(2)}" cy="${(rowH * 2).toFixed(2)}" r="${r.toFixed(2)}" fill="#FFFFFF"/></pattern>`;
      patBody += `<rect x="${illX.toFixed(2)}" y="${y.toFixed(2)}" width="${illWidth.toFixed(2)}" height="${zoneH.toFixed(2)}" fill="url(#${patId})"/>`;
    } else if (patternType === 'DIAGONAL') {
      const spacing = Math.max(lmap(effectiveDensity, 1, 10, 30, 4), 1.5);
      patDefs += `<pattern id="${patId}" x="${illX.toFixed(2)}" y="${y.toFixed(2)}" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse"><line x1="${-spacing}" y1="${spacing}" x2="${spacing}" y2="${-spacing}" stroke="#FFFFFF" stroke-width="0.4"/><line x1="0" y1="${spacing * 2}" x2="${spacing * 2}" y2="0" stroke="#FFFFFF" stroke-width="0.4"/></pattern>`;
      patBody += `<rect x="${illX.toFixed(2)}" y="${y.toFixed(2)}" width="${illWidth.toFixed(2)}" height="${zoneH.toFixed(2)}" fill="url(#${patId})"/>`;
    } else if (patternType === 'CROSS-HATCH') {
      const spacing = Math.max(lmap(effectiveDensity, 1, 10, 30, 4), 1.5);
      patDefs += `<pattern id="${patId}" x="${illX.toFixed(2)}" y="${y.toFixed(2)}" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse"><line x1="${-spacing}" y1="${spacing}" x2="${spacing}" y2="${-spacing}" stroke="#FFFFFF" stroke-width="0.4"/><line x1="0" y1="${spacing * 2}" x2="${spacing * 2}" y2="0" stroke="#FFFFFF" stroke-width="0.4"/><line x1="0" y1="0" x2="${spacing * 2}" y2="${spacing * 2}" stroke="#FFFFFF" stroke-width="0.4"/><line x1="${-spacing}" y1="0" x2="${spacing}" y2="${spacing * 2}" stroke="#FFFFFF" stroke-width="0.4"/></pattern>`;
      patBody += `<rect x="${illX.toFixed(2)}" y="${y.toFixed(2)}" width="${illWidth.toFixed(2)}" height="${zoneH.toFixed(2)}" fill="url(#${patId})"/>`;
    } else if (patternType === 'WOVEN') {
      const spacing = Math.max(lmap(effectiveDensity, 1, 10, 8, 1), 0.5);
      for (let cy = y + spacing; cy < y + zoneH; cy += spacing) {
        patBody += `<line x1="${illX.toFixed(2)}" y1="${cy.toFixed(2)}" x2="${(illX + illWidth).toFixed(2)}" y2="${cy.toFixed(2)}" stroke="#FFFFFF" stroke-width="0.3"/>`;
      }
    } else if (patternType === 'NOISE') {
      const rng = makeRng(zoneSeed ^ 0x99887766);
      const area = illWidth * zoneH;
      const count = Math.round(lmap(effectiveDensity, 1, 10, 30, 300) * (area / 1000));
      for (let j = 0; j < count; j++) {
        const rx = illX + rng.next() * illWidth;
        const ry = y + rng.next() * zoneH;
        patBody += `<rect x="${rx.toFixed(2)}" y="${ry.toFixed(2)}" width="1" height="1" fill="#FFFFFF" opacity="0.35"/>`;
      }
    }
  }

  for (let i = 0; i < positions.length; i++) {
    const y = positions[i];
    const isAccent = accentLayerEnabled && i === accentLayerIndex;
    const strokeColor = isAccent ? '#E8E0D0' : '#FFFFFF';
    const strokeWidth = isAccent ? 1 : 0.5;
    lineBody += `<line x1="${illX.toFixed(2)}" y1="${y.toFixed(2)}" x2="${(illX + illWidth).toFixed(2)}" y2="${y.toFixed(2)}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>`;

    if (showDepthNumbers) {
      labelBody += `<text x="${(illX - 8).toFixed(1)}" y="${(y + 0.5).toFixed(1)}" text-anchor="end" dominant-baseline="middle" font-family="'Inter Mono', monospace" font-size="7" fill="#FFFFFF" opacity="0.25">${depthLabels[i]}</text>`;
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}">
  <rect width="${canvasWidth}" height="${canvasHeight}" fill="none"/>
  <defs>${patDefs}</defs>
  <g opacity="${opacity}">
    ${patBody}
    ${lineBody}
  </g>
  ${labelBody}
</svg>`;
}
