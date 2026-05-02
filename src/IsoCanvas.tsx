import React, { useMemo } from 'react';
import type { StrataConfig } from './types';
import { calculateLayerPositions, strokeWeightAt } from './composition';
import { renderZonePattern } from './patterns';

const ISO_R = Math.cos(Math.PI / 6); // 0.8660
const ISO_S = Math.sin(Math.PI / 6); // 0.5000

interface IsoCanvasProps {
  config: StrataConfig;
  canvasWidth: number;
  canvasHeight: number;
}

function lmap(v: number, i0: number, i1: number, o0: number, o1: number) {
  return o0 + ((v - i0) / (i1 - i0)) * (o1 - o0);
}

function iso(wx: number, wy: number, wz: number) {
  return { sx: wx * ISO_R - wz * ISO_R, sy: wx * ISO_S + wz * ISO_S - wy };
}

function polyPts(corners: Array<{ x: number; y: number }>): string {
  return corners.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
}

function sc(wx: number, wy: number, wz: number, ox: number, oy: number) {
  const s = iso(wx, wy, wz);
  return { x: ox + s.sx, y: oy + s.sy };
}

export const IsoCanvas = React.forwardRef<SVGSVGElement, IsoCanvasProps>(
  ({ config, canvasWidth, canvasHeight }, ref) => {
    const {
      seed, depth, layers, tension, density, extrusion, lineOpacity,
      thickness, variableWeight, patternAssignment, showDepthNumbers,
      accentLayerEnabled, accentLayerIndex,
    } = config;

    const W = canvasWidth * 0.55;
    const E = lmap(extrusion, 1, 10, 20, 180);
    const opacity = lineOpacity / 100;
    const numZones = layers - 1;

    const { gaps, depthLabels } = useMemo(
      () => calculateLayerPositions(layers, depth, tension, seed, canvasHeight),
      [layers, depth, tension, seed, canvasHeight],
    );

    const totalY = gaps.reduce((a, b) => a + b, 0);

    const screenW = (W + E) * ISO_R;
    const screenH = totalY + (W + E) * ISO_S;
    const fitScale = Math.min(1, (canvasWidth * 0.90) / screenW, (canvasHeight * 0.90) / screenH);

    const ox = canvasWidth  / 2 - (W - E) * ISO_R / 2;
    const oy = canvasHeight / 2 + (totalY - (W + E) * ISO_S) / 2;

    const worldYBase: number[] = [];
    {
      let cum = totalY;
      for (let i = 0; i < numZones; i++) {
        worldYBase.push(cum - gaps[i]);
        cum -= gaps[i];
      }
    }

    const blockEls: React.ReactElement[] = [];

    for (let idx = numZones - 1; idx >= 0; idx--) {
      const T   = gaps[idx];
      const Yb  = worldYBase[idx];
      const Yt  = Yb + T;
      const isCore   = idx === numZones - 1;
      const isAccent = accentLayerEnabled && idx === accentLayerIndex;
      const zoneWeight = strokeWeightAt(idx, numZones, thickness, variableWeight);

      const p = (wx: number, wy: number, wz: number) => sc(wx, wy, wz, ox, oy);

      const topFace   = [p(0, Yt, 0), p(W, Yt, 0), p(W, Yt, E), p(0, Yt, E)];
      const frontFace = [p(0, Yb, 0), p(W, Yb, 0), p(W, Yt, 0), p(0, Yt, 0)];
      const rightFace = [p(W, Yb, 0), p(W, Yb, E), p(W, Yt, E), p(W, Yt, 0)];

      const topMinX = Math.min(...topFace.map(q => q.x));
      const topMaxX = Math.max(...topFace.map(q => q.x));
      const topMinY = Math.min(...topFace.map(q => q.y));
      const topMaxY = Math.max(...topFace.map(q => q.y));

      const clipId = `clip-iso-${seed}-${idx}`;
      const patternEl = renderZonePattern({
        id: `iso-zone-${seed}-${idx}`,
        type: patternAssignment[idx] ?? 'EMPTY',
        density,
        weight: zoneWeight,
        x: topMinX, y: topMinY,
        width:  topMaxX - topMinX,
        height: topMaxY - topMinY,
        seed: seed ^ (idx * 0x1a2b3c4d),
        isCore,
      });

      const lineWeight  = strokeWeightAt(idx, numZones, thickness, variableWeight);
      const topStroke   = isAccent ? '#E8E0D0' : '#FFFFFF';
      const topStrokeW  = isAccent ? Math.max(lineWeight + 0.5, 1) : lineWeight;
      const rightBg     = isAccent ? '#181818' : '#111111';

      // rightFace[0] = p(W, Yb, 0) — frontmost right-column point, maximum screen x
      const labelX = rightFace[0].x;
      const labelY = (rightFace[0].y + rightFace[3].y) / 2;

      blockEls.push(
        <g key={`block-${idx}`}>
          <polygon points={polyPts(frontFace)} fill="#0D0D0D" stroke="#2A2A2A" strokeWidth={0.5} />
          <polygon points={polyPts(rightFace)} fill={rightBg}  stroke="#2A2A2A" strokeWidth={0.5} />
          <defs>
            <clipPath id={clipId}>
              <polygon points={polyPts(topFace)} />
            </clipPath>
          </defs>
          <polygon points={polyPts(topFace)} fill="#050505" stroke="none" />
          {patternEl && <g clipPath={`url(#${clipId})`}>{patternEl}</g>}
          <polygon points={polyPts(topFace)} fill="none" stroke={topStroke} strokeWidth={topStrokeW} />
          {showDepthNumbers && (
            <text x={labelX + 4} y={labelY}
              textAnchor="start" dominantBaseline="middle"
              fontFamily="'Inter Mono', monospace" fontSize={7} fill="#FFFFFF" opacity={0.25}>
              {depthLabels[idx]}
            </text>
          )}
        </g>,
      );
    }

    return (
      <svg ref={ref} xmlns="http://www.w3.org/2000/svg"
        width={canvasWidth} height={canvasHeight} style={{ display: 'block' }}>
        <rect width={canvasWidth} height={canvasHeight} fill="#050505" />
        <g transform={`translate(${canvasWidth / 2},${canvasHeight / 2}) scale(${fitScale}) translate(${-canvasWidth / 2},${-canvasHeight / 2})`}>
          <g opacity={opacity}>{blockEls}</g>
        </g>
      </svg>
    );
  },
);

IsoCanvas.displayName = 'IsoCanvas';

// ── String export ─────────────────────────────────────────────────────────

export function exportISOSVGString(
  config: StrataConfig,
  canvasWidth: number,
  canvasHeight: number,
): string {
  const {
    seed, depth, layers, tension, density, extrusion, lineOpacity,
    thickness, variableWeight, patternAssignment, showDepthNumbers,
    accentLayerEnabled, accentLayerIndex,
  } = config;

  const W = canvasWidth * 0.55;
  const E = lmap(extrusion, 1, 10, 20, 180);
  const opacity = lineOpacity / 100;
  const numZones = layers - 1;

  const { gaps, depthLabels } = calculateLayerPositions(layers, depth, tension, seed, canvasHeight);
  const totalY = gaps.reduce((a, b) => a + b, 0);

  const screenW = (W + E) * ISO_R;
  const screenH = totalY + (W + E) * ISO_S;
  const fitScale = Math.min(1, (canvasWidth * 0.90) / screenW, (canvasHeight * 0.90) / screenH);

  const ox = canvasWidth  / 2 - (W - E) * ISO_R / 2;
  const oy = canvasHeight / 2 + (totalY - (W + E) * ISO_S) / 2;

  const worldYBase: number[] = [];
  {
    let cum = totalY;
    for (let i = 0; i < numZones; i++) {
      worldYBase.push(cum - gaps[i]);
      cum -= gaps[i];
    }
  }

  function pt(wx: number, wy: number, wz: number) {
    const s = iso(wx, wy, wz);
    return { x: ox + s.sx, y: oy + s.sy };
  }
  function poly(corners: Array<{ x: number; y: number }>) {
    return corners.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  }

  let defs = '';
  let body = '';
  let labels = '';

  for (let idx = numZones - 1; idx >= 0; idx--) {
    const T  = gaps[idx];
    const Yb = worldYBase[idx];
    const Yt = Yb + T;
    const isCore   = idx === numZones - 1;
    const isAccent = accentLayerEnabled && idx === accentLayerIndex;

    const topFace   = [pt(0, Yt, 0), pt(W, Yt, 0), pt(W, Yt, E), pt(0, Yt, E)];
    const frontFace = [pt(0, Yb, 0), pt(W, Yb, 0), pt(W, Yt, 0), pt(0, Yt, 0)];
    const rightFace = [pt(W, Yb, 0), pt(W, Yb, E), pt(W, Yt, E), pt(W, Yt, 0)];

    const topMinX = Math.min(...topFace.map(q => q.x));
    const topMaxX = Math.max(...topFace.map(q => q.x));
    const topMinY = Math.min(...topFace.map(q => q.y));
    const topMaxY = Math.max(...topFace.map(q => q.y));
    const bW = topMaxX - topMinX;
    const bH = topMaxY - topMinY;

    const effectiveDensity = isCore ? Math.min(density * 1.5, 10) : density;
    const patternType = patternAssignment[idx] ?? 'EMPTY';
    const zoneWeight = strokeWeightAt(idx, numZones, thickness, variableWeight);
    
    const clipId = `clip-iso-${seed}-${idx}`;

    defs += `<clipPath id="${clipId}"><polygon points="${poly(topFace)}"/></clipPath>`;

    let patFill = '';
    if (patternType === 'DOTS') {
      const sp = Math.max(lmap(effectiveDensity, 1, 10, 20, 3), 1);
      const r  = Math.max(zoneWeight * 0.45, 0.3);
      let circles = '';
      for (let cx = topMinX; cx <= topMaxX + sp; cx += sp) {
        for (let cy = topMinY; cy <= topMaxY + sp; cy += sp) {
          circles += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(2)}" fill="#FFFFFF"/>`;
        }
      }
      patFill = circles;
    } else if (patternType === 'DIAGONAL') {
      const sp = Math.max(lmap(effectiveDensity, 1, 10, 30, 4), 1.5);
      const sw = Math.max(zoneWeight * 0.55, 0.3);
      let lines = '';
      for (let x0 = topMinX - bH; x0 < topMaxX + sp; x0 += sp) {
        lines += `<line x1="${x0.toFixed(1)}" y1="${(topMinY + bH).toFixed(1)}" x2="${(x0 + bH).toFixed(1)}" y2="${topMinY.toFixed(1)}" stroke="#FFFFFF" stroke-width="${sw.toFixed(2)}"/>`;
      }
      patFill = lines;
    } else if (patternType === 'CROSS-HATCH') {
      const sp = Math.max(lmap(effectiveDensity, 1, 10, 30, 4), 1.5);
      const sw = Math.max(zoneWeight * 0.55, 0.3);
      let lines = '';
      for (let x0 = topMinX - bH; x0 < topMaxX + sp; x0 += sp) {
        lines += `<line x1="${x0.toFixed(1)}" y1="${(topMinY + bH).toFixed(1)}" x2="${(x0 + bH).toFixed(1)}" y2="${topMinY.toFixed(1)}" stroke="#FFFFFF" stroke-width="${sw.toFixed(2)}"/>`;
        lines += `<line x1="${x0.toFixed(1)}" y1="${topMinY.toFixed(1)}" x2="${(x0 + bH).toFixed(1)}" y2="${(topMinY + bH).toFixed(1)}" stroke="#FFFFFF" stroke-width="${sw.toFixed(2)}"/>`;
      }
      patFill = lines;
    } else if (patternType === 'WOVEN') {
      const sp = Math.max(lmap(effectiveDensity, 1, 10, 8, 1), 0.5);
      const sw = Math.max(zoneWeight * 0.45, 0.25);
      let lines = '';
      for (let cy = topMinY + sp; cy < topMinY + bH; cy += sp) {
        lines += `<line x1="${topMinX.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${(topMinX + bW).toFixed(1)}" y2="${cy.toFixed(1)}" stroke="#FFFFFF" stroke-width="${sw.toFixed(2)}"/>`;
      }
      patFill = lines;
    }

    const lineWeight  = strokeWeightAt(idx, numZones, thickness, variableWeight);
    const topStroke   = isAccent ? '#E8E0D0' : '#FFFFFF';
    const topStrokeW  = isAccent ? Math.max(lineWeight + 0.5, 1).toFixed(2) : lineWeight.toFixed(2);
    const rightBg     = isAccent ? '#181818' : '#111111';

    body += `<polygon points="${poly(frontFace)}" fill="#0D0D0D" stroke="#2A2A2A" stroke-width="0.5"/>`;
    body += `<polygon points="${poly(rightFace)}" fill="${rightBg}" stroke="#2A2A2A" stroke-width="0.5"/>`;
    body += `<polygon points="${poly(topFace)}" fill="#050505" stroke="none"/>`;
    if (patFill) {
      body += `<g clip-path="url(#${clipId})">${patFill}</g>`;
    }
    body += `<polygon points="${poly(topFace)}" fill="none" stroke="${topStroke}" stroke-width="${topStrokeW}"/>`;

    if (showDepthNumbers) {
      const labelX = rightFace[0].x;
      const labelY = (rightFace[0].y + rightFace[3].y) / 2;
      labels += `<text x="${(labelX + 4).toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="start" dominant-baseline="middle" font-family="'Inter Mono', monospace" font-size="7" fill="#FFFFFF" opacity="0.25">${depthLabels[idx]}</text>`;
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}">
  <rect width="${canvasWidth}" height="${canvasHeight}" fill="none"/>
  <defs>${defs}</defs>
  <g transform="translate(${canvasWidth / 2},${canvasHeight / 2}) scale(${fitScale}) translate(${-canvasWidth / 2},${-canvasHeight / 2})">
    <g opacity="${opacity}">${body}</g>
  </g>
  ${labels}
</svg>`;
}
