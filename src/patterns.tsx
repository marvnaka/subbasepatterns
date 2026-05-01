import React from 'react';
import type { PatternType } from './types';
import { makeRng } from './prng';

function lmap(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

export interface ZonePatternProps {
  id: string;
  type: PatternType;
  density: number;
  x: number;
  y: number;
  width: number;
  height: number;
  seed: number;
  isCore?: boolean;
}

export function renderZonePattern(props: ZonePatternProps): React.ReactElement | null {
  const { id, type, density, x, y, width, height, seed, isCore } = props;
  const effectiveDensity = isCore ? Math.min(density * 1.5, 10) : density;

  if (type === 'EMPTY' || height <= 0) return null;

  switch (type) {
    case 'DOTS':
      return renderDots(id, effectiveDensity, x, y, width, height);
    case 'STIPPLE':
      return renderStipple(id, effectiveDensity, x, y, width, height, seed);
    case 'DIAGONAL':
      return renderDiagonal(id, effectiveDensity, x, y, width, height);
    case 'CROSS-HATCH':
      return renderCrossHatch(id, effectiveDensity, x, y, width, height);
    case 'NOISE':
      return renderNoise(id, effectiveDensity, x, y, width, height, seed);
    case 'WOVEN':
      return renderWoven(id, effectiveDensity, x, y, width, height);
    default:
      return null;
  }
}

function renderDots(
  id: string,
  density: number,
  x: number,
  y: number,
  width: number,
  height: number,
): React.ReactElement {
  const spacing = Math.max(lmap(density, 1, 10, 20, 3), 1);
  const patId = `pat-${id}`;
  return (
    <g key={id}>
      <defs>
        <pattern id={patId} x={x} y={y} width={spacing} height={spacing} patternUnits="userSpaceOnUse">
          <circle cx={spacing / 2} cy={spacing / 2} r={0.4} fill="#3A3A3A" />
        </pattern>
      </defs>
      <rect x={x} y={y} width={width} height={height} fill={`url(#${patId})`} />
    </g>
  );
}

function renderStipple(
  id: string,
  density: number,
  x: number,
  y: number,
  width: number,
  height: number,
  seed: number,
): React.ReactElement {
  const area = width * height;
  const count = Math.round(lmap(density, 1, 10, 20, 200) * (area / 1000));
  const rng = makeRng(seed ^ 0xabcdef12);
  const circles: React.ReactElement[] = [];
  for (let i = 0; i < count; i++) {
    const cx = x + rng.next() * width;
    const cy = y + rng.next() * height;
    const r = rng.range(0.3, 0.8);
    circles.push(<circle key={i} cx={cx} cy={cy} r={r} fill="#3A3A3A" />);
  }
  return <g key={id}>{circles}</g>;
}

function renderDiagonal(
  id: string,
  density: number,
  x: number,
  y: number,
  width: number,
  height: number,
): React.ReactElement {
  const spacing = Math.max(lmap(density, 1, 10, 30, 4), 1.5);
  const patId = `pat-${id}`;
  return (
    <g key={id}>
      <defs>
        <pattern id={patId} x={x} y={y} width={spacing} height={spacing} patternUnits="userSpaceOnUse">
          <line x1={-spacing} y1={spacing} x2={spacing} y2={-spacing} stroke="#3A3A3A" strokeWidth={0.4} />
          <line x1={0} y1={spacing * 2} x2={spacing * 2} y2={0} stroke="#3A3A3A" strokeWidth={0.4} />
        </pattern>
      </defs>
      <rect x={x} y={y} width={width} height={height} fill={`url(#${patId})`} />
    </g>
  );
}

function renderCrossHatch(
  id: string,
  density: number,
  x: number,
  y: number,
  width: number,
  height: number,
): React.ReactElement {
  const spacing = Math.max(lmap(density, 1, 10, 30, 4), 1.5);
  const patId = `pat-${id}`;
  return (
    <g key={id}>
      <defs>
        <pattern id={patId} x={x} y={y} width={spacing} height={spacing} patternUnits="userSpaceOnUse">
          <line x1={-spacing} y1={spacing} x2={spacing} y2={-spacing} stroke="#3A3A3A" strokeWidth={0.4} />
          <line x1={0} y1={spacing * 2} x2={spacing * 2} y2={0} stroke="#3A3A3A" strokeWidth={0.4} />
          <line x1={0} y1={0} x2={spacing * 2} y2={spacing * 2} stroke="#3A3A3A" strokeWidth={0.4} />
          <line x1={-spacing} y1={0} x2={spacing} y2={spacing * 2} stroke="#3A3A3A" strokeWidth={0.4} />
        </pattern>
      </defs>
      <rect x={x} y={y} width={width} height={height} fill={`url(#${patId})`} />
    </g>
  );
}

function renderNoise(
  id: string,
  density: number,
  x: number,
  y: number,
  width: number,
  height: number,
  seed: number,
): React.ReactElement {
  const area = width * height;
  const count = Math.round(lmap(density, 1, 10, 30, 300) * (area / 1000));
  const rng = makeRng(seed ^ 0x99887766);
  const rects: React.ReactElement[] = [];
  for (let i = 0; i < count; i++) {
    const rx = x + rng.next() * width;
    const ry = y + rng.next() * height;
    rects.push(
      <rect key={i} x={rx} y={ry} width={1} height={1} fill="#3A3A3A" opacity={0.35} />,
    );
  }
  return <g key={id}>{rects}</g>;
}

function renderWoven(
  id: string,
  density: number,
  x: number,
  y: number,
  width: number,
  height: number,
): React.ReactElement {
  const spacing = Math.max(lmap(density, 1, 10, 8, 1), 0.5);
  const lines: React.ReactElement[] = [];
  let cy = y + spacing;
  let i = 0;
  while (cy < y + height) {
    lines.push(
      <line key={i++} x1={x} y1={cy} x2={x + width} y2={cy} stroke="#3A3A3A" strokeWidth={0.3} />,
    );
    cy += spacing;
  }
  return <g key={id}>{lines}</g>;
}

export function getSwatchSVG(type: PatternType, density: number, seed: number): string {
  const w = 20;
  const h = 8;

  if (type === 'EMPTY') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="none"/></svg>`;
  }

  if (type === 'DOTS') {
    const spacing = Math.max(lmap(density, 1, 10, 10, 2), 1.5);
    let circles = '';
    for (let cx = spacing / 2; cx < w; cx += spacing) {
      for (let cy = spacing / 2; cy < h; cy += spacing) {
        circles += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="0.4" fill="#3A3A3A"/>`;
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${circles}</svg>`;
  }

  if (type === 'STIPPLE') {
    const rng = makeRng(seed ^ 0xabcdef12);
    const count = Math.round(lmap(density, 1, 10, 5, 30));
    let circles = '';
    for (let i = 0; i < count; i++) {
      const cx = rng.next() * w;
      const cy = rng.next() * h;
      const r = rng.range(0.3, 0.8);
      circles += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="#3A3A3A"/>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${circles}</svg>`;
  }

  if (type === 'DIAGONAL') {
    const spacing = Math.max(lmap(density, 1, 10, 12, 2), 1.5);
    let lines = '';
    for (let i = -h; i < w + h; i += spacing) {
      lines += `<line x1="${i.toFixed(1)}" y1="0" x2="${(i + h).toFixed(1)}" y2="${h}" stroke="#3A3A3A" stroke-width="0.4"/>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><clipPath id="c${seed}"><rect width="${w}" height="${h}"/></clipPath></defs><g clip-path="url(#c${seed})">${lines}</g></svg>`;
  }

  if (type === 'CROSS-HATCH') {
    const spacing = Math.max(lmap(density, 1, 10, 12, 2), 1.5);
    let lines = '';
    for (let i = -h; i < w + h; i += spacing) {
      lines += `<line x1="${i.toFixed(1)}" y1="0" x2="${(i + h).toFixed(1)}" y2="${h}" stroke="#3A3A3A" stroke-width="0.4"/>`;
      lines += `<line x1="${(i + h).toFixed(1)}" y1="0" x2="${i.toFixed(1)}" y2="${h}" stroke="#3A3A3A" stroke-width="0.4"/>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><clipPath id="c${seed}"><rect width="${w}" height="${h}"/></clipPath></defs><g clip-path="url(#c${seed})">${lines}</g></svg>`;
  }

  if (type === 'NOISE') {
    const rng = makeRng(seed ^ 0x99887766);
    const count = Math.round(lmap(density, 1, 10, 10, 80));
    let rects = '';
    for (let i = 0; i < count; i++) {
      const rx = rng.next() * w;
      const ry = rng.next() * h;
      rects += `<rect x="${rx.toFixed(1)}" y="${ry.toFixed(1)}" width="1" height="1" fill="#3A3A3A" opacity="0.35"/>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${rects}</svg>`;
  }

  if (type === 'WOVEN') {
    const spacing = Math.max(lmap(density, 1, 10, 4, 1), 0.8);
    let lines = '';
    for (let cy = spacing; cy < h; cy += spacing) {
      lines += `<line x1="0" y1="${cy.toFixed(1)}" x2="${w}" y2="${cy.toFixed(1)}" stroke="#3A3A3A" stroke-width="0.3"/>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${lines}</svg>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"></svg>`;
}
