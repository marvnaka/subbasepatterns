import React, { useMemo } from 'react';
import type { StrataConfig } from './types';
import { calculateLayerPositions } from './composition';
import { renderZonePattern } from './patterns';
import { makeRng } from './prng';

// 2:1 isometric (dimetric) constants
const ISO_R = Math.cos(Math.PI / 6); // 0.8660 — right/left horizontal component
const ISO_S = Math.sin(Math.PI / 6); // 0.5000 — right/left vertical component

interface IsoCanvasProps {
  config: StrataConfig;
  canvasWidth: number;
  canvasHeight: number;
}

function lmap(v: number, i0: number, i1: number, o0: number, o1: number) {
  return o0 + ((v - i0) / (i1 - i0)) * (o1 - o0);
}

// World (wx, wy, wz) → screen offset relative to projection origin.
// +x goes right-forward, +y goes up, +z goes left-forward (into screen).
function iso(wx: number, wy: number, wz: number) {
  return {
    sx: wx * ISO_R - wz * ISO_R,
    sy: wx * ISO_S + wz * ISO_S - wy,
  };
}

function polyPts(corners: Array<{ x: number; y: number }>): string {
  return corners.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
}

// Compute the absolute screen position of a world point given an origin.
function sc(wx: number, wy: number, wz: number, ox: number, oy: number) {
  const s = iso(wx, wy, wz);
  return { x: ox + s.sx, y: oy + s.sy };
}

export const IsoCanvas = React.forwardRef<SVGSVGElement, IsoCanvasProps>(
  ({ config, canvasWidth, canvasHeight }, ref) => {
    const {
      seed, depth, layers, tension, density, extrusion, lineOpacity,
      patternAssignment, showDepthNumbers, accentLayerEnabled, accentLayerIndex,
    } = config;

    const W = canvasWidth * 0.55;
    const E = lmap(extrusion, 1, 10, 20, 180);
    const opacity = lineOpacity / 100;

    const { gaps, depthLabels } = useMemo(
      () => calculateLayerPositions(layers, depth, tension, seed, canvasHeight),
      [layers, depth, tension, seed, canvasHeight],
    );

    const numZones = layers - 1;
    const totalY = gaps.reduce((a, b) => a + b, 0);

    // Projection origin: world (0,0,0) = bottom-front-left of the whole stack.
    // Bounding box of the stack in screen offset from origin:
    //   x ∈ [ -E·R,  W·R ]   width  = (W+E)·R
    //   y ∈ [ -totalY,  (W+E)·S ]   height = totalY + (W+E)·S
    // Center of bounding box offset from origin:
    //   cx = (W-E)·R / 2
    //   cy = (-totalY + (W+E)·S) / 2
    // To center on canvas:
    const ox = canvasWidth  / 2 - (W - E) * ISO_R / 2;
    const oy = canvasHeight / 2 + (totalY - (W + E) * ISO_S) / 2;

    // World Y of the BOTTOM of each zone.
    // Zone 0 = surface (top), zone numZones-1 = core (bottom).
    const worldYBase: number[] = [];
    {
      let cum = totalY;
      for (let i = 0; i < numZones; i++) {
        worldYBase.push(cum - gaps[i]);
        cum -= gaps[i];
      }
    }

    const blockEls: React.ReactElement[] = [];

    // Render back-to-front: deepest (core) block first so surface blocks draw on top.
    for (let idx = numZones - 1; idx >= 0; idx--) {
      const T   = gaps[idx];
      const Yb  = worldYBase[idx];
      const Yt  = Yb + T;
      const isCore   = idx === numZones - 1;
      const isAccent = accentLayerEnabled && idx === accentLayerIndex;

      const p = (wx: number, wy: number, wz: number) => sc(wx, wy, wz, ox, oy);

      // ── Three visible faces ────────────────────────────────────────────────
      // TOP face (Y = Yt): the strata surface — carries the fill pattern
      const topFace = [p(0, Yt, 0), p(W, Yt, 0), p(W, Yt, E), p(0, Yt, E)];
      // FRONT face (Z = 0): faces the viewer, very dark
      const frontFace = [p(0, Yb, 0), p(W, Yb, 0), p(W, Yt, 0), p(0, Yt, 0)];
      // RIGHT face (X = W): right side, slightly lighter
      const rightFace = [p(W, Yb, 0), p(W, Yb, E), p(W, Yt, E), p(W, Yt, 0)];

      // Bounding box of top face — used to position the fill pattern.
      const topMinX = Math.min(...topFace.map(q => q.x));
      const topMaxX = Math.max(...topFace.map(q => q.x));
      const topMinY = Math.min(...topFace.map(q => q.y));
      const topMaxY = Math.max(...topFace.map(q => q.y));

      const clipId = `clip-iso-${seed}-${idx}`;
      const patternEl = renderZonePattern({
        id: `iso-zone-${seed}-${idx}`,
        type: patternAssignment[idx] ?? 'EMPTY',
        density,
        x: topMinX,
        y: topMinY,
        width:  topMaxX - topMinX,
        height: topMaxY - topMinY,
        seed: seed ^ (idx * 0x1a2b3c4d),
        isCore,
      });

      const topStroke   = isAccent ? '#E8E0D0' : '#FFFFFF';
      const topStrokeW  = isAccent ? 1 : 0.5;
      const rightBg     = isAccent ? '#181818' : '#111111';

      // Depth label: left edge of front face, vertically centred.
      const labelX = frontFace[3].x;  // top-left corner of front face
      const labelY = (frontFace[0].y + frontFace[3].y) / 2;

      blockEls.push(
        <g key={`block-${idx}`}>
          <polygon points={polyPts(frontFace)} fill="#0D0D0D" stroke="#2A2A2A" strokeWidth={0.5} />
          <polygon points={polyPts(rightFace)} fill={rightBg}  stroke="#2A2A2A" strokeWidth={0.5} />
          <defs>
            <clipPath id={clipId}>
              <polygon points={polyPts(topFace)} />
            </clipPath>
          </defs>
          {/* Dark base so EMPTY zones don't show raw canvas */}
          <polygon points={polyPts(topFace)} fill="#050505" stroke="none" />
          {patternEl && (
            <g clipPath={`url(#${clipId})`}>{patternEl}</g>
          )}
          <polygon points={polyPts(topFace)} fill="none" stroke={topStroke} strokeWidth={topStrokeW} />
          {showDepthNumbers && (
            <text
              x={labelX - 4}
              y={labelY}
              textAnchor="end"
              dominantBaseline="middle"
              fontFamily="'Inter Mono', monospace"
              fontSize={7}
              fill="#2A2A2A"
            >
              {depthLabels[idx]}
            </text>
          )}
        </g>,
      );
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
        <g opacity={opacity}>{blockEls}</g>
      </svg>
    );
  },
);

IsoCanvas.displayName = 'IsoCanvas';

// ── String-based export (mirrors the React renderer) ───────────────────────

export function exportISOSVGString(
  config: StrataConfig,
  canvasWidth: number,
  canvasHeight: number,
): string {
  const {
    seed, depth, layers, tension, density, extrusion, lineOpacity,
    patternAssignment, showDepthNumbers, accentLayerEnabled, accentLayerIndex,
  } = config;

  const W = canvasWidth * 0.55;
  const E = lmap(extrusion, 1, 10, 20, 180);
  const opacity = lineOpacity / 100;

  const { gaps, depthLabels } = calculateLayerPositions(layers, depth, tension, seed, canvasHeight);

  const numZones = layers - 1;
  const totalY = gaps.reduce((a, b) => a + b, 0);

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

  function polyStr(corners: Array<{ x: number; y: number }>) {
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
    const zoneSeed = seed ^ (idx * 0x1a2b3c4d);
    const clipId = `clip-iso-${seed}-${idx}`;
    const patId  = `pat-iso-${seed}-${idx}`;

    defs += `<clipPath id="${clipId}"><polygon points="${polyStr(topFace)}"/></clipPath>`;

    // Pattern fill for top face
    let patFill = '';
    if (patternType === 'DOTS') {
      const sp = Math.max(lmap(effectiveDensity, 1, 10, 20, 3), 1);
      defs += `<pattern id="${patId}" x="${topMinX.toFixed(2)}" y="${topMinY.toFixed(2)}" width="${sp}" height="${sp}" patternUnits="userSpaceOnUse"><circle cx="${(sp/2).toFixed(2)}" cy="${(sp/2).toFixed(2)}" r="0.4" fill="#FFFFFF"/></pattern>`;
      patFill = `<g clip-path="url(#${clipId})"><rect x="${topMinX.toFixed(2)}" y="${topMinY.toFixed(2)}" width="${bW.toFixed(2)}" height="${bH.toFixed(2)}" fill="url(#${patId})"/></g>`;
    } else if (patternType === 'STIPPLE') {
      const sp = Math.max(lmap(effectiveDensity, 1, 10, 20, 4), 2);
      const rH = sp * Math.sqrt(3) / 2;
      const r  = Math.max(sp * 0.18, 0.4);
      defs += `<pattern id="${patId}" x="${topMinX.toFixed(2)}" y="${topMinY.toFixed(2)}" width="${sp.toFixed(2)}" height="${(rH*2).toFixed(2)}" patternUnits="userSpaceOnUse"><circle cx="0" cy="0" r="${r.toFixed(2)}" fill="#FFFFFF"/><circle cx="${sp.toFixed(2)}" cy="0" r="${r.toFixed(2)}" fill="#FFFFFF"/><circle cx="${(sp/2).toFixed(2)}" cy="${rH.toFixed(2)}" r="${r.toFixed(2)}" fill="#FFFFFF"/><circle cx="0" cy="${(rH*2).toFixed(2)}" r="${r.toFixed(2)}" fill="#FFFFFF"/><circle cx="${sp.toFixed(2)}" cy="${(rH*2).toFixed(2)}" r="${r.toFixed(2)}" fill="#FFFFFF"/></pattern>`;
      patFill = `<g clip-path="url(#${clipId})"><rect x="${topMinX.toFixed(2)}" y="${topMinY.toFixed(2)}" width="${bW.toFixed(2)}" height="${bH.toFixed(2)}" fill="url(#${patId})"/></g>`;
    } else if (patternType === 'DIAGONAL') {
      const sp = Math.max(lmap(effectiveDensity, 1, 10, 30, 4), 1.5);
      defs += `<pattern id="${patId}" x="${topMinX.toFixed(2)}" y="${topMinY.toFixed(2)}" width="${sp}" height="${sp}" patternUnits="userSpaceOnUse"><line x1="${-sp}" y1="${sp}" x2="${sp}" y2="${-sp}" stroke="#FFFFFF" stroke-width="0.4"/><line x1="0" y1="${sp*2}" x2="${sp*2}" y2="0" stroke="#FFFFFF" stroke-width="0.4"/></pattern>`;
      patFill = `<g clip-path="url(#${clipId})"><rect x="${topMinX.toFixed(2)}" y="${topMinY.toFixed(2)}" width="${bW.toFixed(2)}" height="${bH.toFixed(2)}" fill="url(#${patId})"/></g>`;
    } else if (patternType === 'CROSS-HATCH') {
      const sp = Math.max(lmap(effectiveDensity, 1, 10, 30, 4), 1.5);
      defs += `<pattern id="${patId}" x="${topMinX.toFixed(2)}" y="${topMinY.toFixed(2)}" width="${sp}" height="${sp}" patternUnits="userSpaceOnUse"><line x1="${-sp}" y1="${sp}" x2="${sp}" y2="${-sp}" stroke="#FFFFFF" stroke-width="0.4"/><line x1="0" y1="${sp*2}" x2="${sp*2}" y2="0" stroke="#FFFFFF" stroke-width="0.4"/><line x1="0" y1="0" x2="${sp*2}" y2="${sp*2}" stroke="#FFFFFF" stroke-width="0.4"/><line x1="${-sp}" y1="0" x2="${sp}" y2="${sp*2}" stroke="#FFFFFF" stroke-width="0.4"/></pattern>`;
      patFill = `<g clip-path="url(#${clipId})"><rect x="${topMinX.toFixed(2)}" y="${topMinY.toFixed(2)}" width="${bW.toFixed(2)}" height="${bH.toFixed(2)}" fill="url(#${patId})"/></g>`;
    } else if (patternType === 'WOVEN') {
      const sp = Math.max(lmap(effectiveDensity, 1, 10, 8, 1), 0.5);
      let wLines = '';
      for (let cy = topMinY + sp; cy < topMinY + bH; cy += sp) {
        wLines += `<line x1="${topMinX.toFixed(2)}" y1="${cy.toFixed(2)}" x2="${(topMinX+bW).toFixed(2)}" y2="${cy.toFixed(2)}" stroke="#FFFFFF" stroke-width="0.3"/>`;
      }
      patFill = `<g clip-path="url(#${clipId})">${wLines}</g>`;
    } else if (patternType === 'NOISE') {
      const rng = makeRng(zoneSeed ^ 0x99887766);
      const count = Math.round(lmap(effectiveDensity, 1, 10, 30, 300) * (bW * bH / 1000));
      let nRects = '';
      for (let j = 0; j < count; j++) {
        const rx = topMinX + rng.next() * bW;
        const ry = topMinY + rng.next() * bH;
        nRects += `<rect x="${rx.toFixed(2)}" y="${ry.toFixed(2)}" width="1" height="1" fill="#FFFFFF" opacity="0.35"/>`;
      }
      patFill = `<g clip-path="url(#${clipId})">${nRects}</g>`;
    }

    const topStroke  = isAccent ? '#E8E0D0' : '#FFFFFF';
    const topStrokeW = isAccent ? 1 : 0.5;
    const rightBg    = isAccent ? '#181818' : '#111111';

    body += `<polygon points="${polyStr(frontFace)}" fill="#0D0D0D" stroke="#2A2A2A" stroke-width="0.5"/>`;
    body += `<polygon points="${polyStr(rightFace)}" fill="${rightBg}" stroke="#2A2A2A" stroke-width="0.5"/>`;
    body += `<polygon points="${polyStr(topFace)}" fill="#050505" stroke="none"/>`;
    body += patFill;
    body += `<polygon points="${polyStr(topFace)}" fill="none" stroke="${topStroke}" stroke-width="${topStrokeW}"/>`;

    if (showDepthNumbers) {
      const labelX = frontFace[3].x;
      const labelY = (frontFace[0].y + frontFace[3].y) / 2;
      labels += `<text x="${(labelX - 4).toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="end" dominant-baseline="middle" font-family="'Inter Mono', monospace" font-size="7" fill="#2A2A2A">${depthLabels[idx]}</text>`;
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}">
  <rect width="${canvasWidth}" height="${canvasHeight}" fill="none"/>
  <defs>${defs}</defs>
  <g opacity="${opacity}">${body}</g>
  ${labels}
</svg>`;
}
