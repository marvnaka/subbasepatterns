import React from 'react';
import type { PatternType } from './types';

function lmap(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

export interface ZonePatternProps {
  id: string;
  type: PatternType;
  density: number;
  weight: number;    // stroke weight — scales dot radius and line widths
  x: number;
  y: number;
  width: number;
  height: number;
  seed: number;
  isCore?: boolean;
}

export function renderZonePattern(props: ZonePatternProps): React.ReactElement | null {
  const { id, type, density, weight, x, y, width, height, isCore } = props;
  const effectiveDensity = isCore ? Math.min(density * 1.5, 10) : density;

  if (type === 'EMPTY' || height <= 0) return null;

  switch (type) {
    case 'DOTS':      return renderDots(id, effectiveDensity, weight, x, y, width, height);
    case 'DIAGONAL':  return renderDiagonal(id, effectiveDensity, weight, x, y, width, height);
    case 'CROSS-HATCH': return renderCrossHatch(id, effectiveDensity, weight, x, y, width, height);
    case 'WOVEN':     return renderWoven(id, effectiveDensity, weight, x, y, width, height);
    default:          return null;
  }
}

function renderDots(
  id: string, density: number, weight: number,
  x: number, y: number, width: number, height: number,
): React.ReactElement {
  const spacing = Math.max(lmap(density, 1, 10, 20, 3), 1);
  const r = Math.max(weight * 0.45, 0.3);
  const patId = `pat-${id}`;
  return (
    <g key={id}>
      <defs>
        <pattern id={patId} x={x} y={y} width={spacing} height={spacing} patternUnits="userSpaceOnUse">
          <circle cx={spacing / 2} cy={spacing / 2} r={r} fill="#FFFFFF" />
        </pattern>
      </defs>
      <rect x={x} y={y} width={width} height={height} fill={`url(#${patId})`} />
    </g>
  );
}

function renderDiagonal(
  id: string, density: number, weight: number,
  x: number, y: number, width: number, height: number,
): React.ReactElement {
  const spacing = Math.max(lmap(density, 1, 10, 30, 4), 1.5);
  const sw = Math.max(weight * 0.55, 0.3);
  const patId = `pat-${id}`;
  return (
    <g key={id}>
      <defs>
        <pattern id={patId} x={x} y={y} width={spacing} height={spacing} patternUnits="userSpaceOnUse">
          <line x1={-spacing} y1={spacing} x2={spacing} y2={-spacing} stroke="#FFFFFF" strokeWidth={sw} />
          <line x1={0} y1={spacing * 2} x2={spacing * 2} y2={0} stroke="#FFFFFF" strokeWidth={sw} />
        </pattern>
      </defs>
      <rect x={x} y={y} width={width} height={height} fill={`url(#${patId})`} />
    </g>
  );
}

function renderCrossHatch(
  id: string, density: number, weight: number,
  x: number, y: number, width: number, height: number,
): React.ReactElement {
  const spacing = Math.max(lmap(density, 1, 10, 30, 4), 1.5);
  const sw = Math.max(weight * 0.55, 0.3);
  const patId = `pat-${id}`;
  return (
    <g key={id}>
      <defs>
        <pattern id={patId} x={x} y={y} width={spacing} height={spacing} patternUnits="userSpaceOnUse">
          <line x1={-spacing} y1={spacing}     x2={spacing}     y2={-spacing}    stroke="#FFFFFF" strokeWidth={sw} />
          <line x1={0}        y1={spacing * 2} x2={spacing * 2} y2={0}           stroke="#FFFFFF" strokeWidth={sw} />
          <line x1={0}        y1={0}           x2={spacing * 2} y2={spacing * 2} stroke="#FFFFFF" strokeWidth={sw} />
          <line x1={-spacing} y1={0}           x2={spacing}     y2={spacing * 2} stroke="#FFFFFF" strokeWidth={sw} />
        </pattern>
      </defs>
      <rect x={x} y={y} width={width} height={height} fill={`url(#${patId})`} />
    </g>
  );
}

function renderWoven(
  id: string, density: number, weight: number,
  x: number, y: number, width: number, height: number,
): React.ReactElement {
  const spacing = Math.max(lmap(density, 1, 10, 8, 1), 0.5);
  const sw = Math.max(weight * 0.45, 0.25);
  const lines: React.ReactElement[] = [];
  let cy = y + spacing;
  let i = 0;
  while (cy < y + height) {
    lines.push(
      <line key={i++} x1={x} y1={cy} x2={x + width} y2={cy} stroke="#FFFFFF" strokeWidth={sw} />,
    );
    cy += spacing;
  }
  return <g key={id}>{lines}</g>;
}

// ── Swatch preview (20×8px dark-background SVG string) ─────────────────────

export function getSwatchSVG(type: PatternType, density: number, _seed: number): string {
  const w = 20;
  const h = 8;
  const bg = `<rect width="${w}" height="${h}" fill="#0A0A0A"/>`;

  if (type === 'EMPTY') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${bg}</svg>`;
  }

  if (type === 'DOTS') {
    const spacing = Math.max(lmap(density, 1, 10, 10, 2), 1.5);
    let circles = '';
    for (let cx = spacing / 2; cx < w; cx += spacing) {
      for (let cy = spacing / 2; cy < h; cy += spacing) {
        circles += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="0.5" fill="#FFFFFF"/>`;
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${bg}${circles}</svg>`;
  }

  if (type === 'DIAGONAL') {
    const spacing = Math.max(lmap(density, 1, 10, 12, 2), 1.5);
    let lines = '';
    for (let i = -h; i < w + h; i += spacing) {
      lines += `<line x1="${i.toFixed(1)}" y1="0" x2="${(i + h).toFixed(1)}" y2="${h}" stroke="#FFFFFF" stroke-width="0.5"/>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><clipPath id="dc${w}"><rect width="${w}" height="${h}"/></clipPath></defs>${bg}<g clip-path="url(#dc${w})">${lines}</g></svg>`;
  }

  if (type === 'CROSS-HATCH') {
    const spacing = Math.max(lmap(density, 1, 10, 12, 2), 1.5);
    let lines = '';
    for (let i = -h; i < w + h; i += spacing) {
      lines += `<line x1="${i.toFixed(1)}" y1="0" x2="${(i + h).toFixed(1)}" y2="${h}" stroke="#FFFFFF" stroke-width="0.5"/>`;
      lines += `<line x1="${(i + h).toFixed(1)}" y1="0" x2="${i.toFixed(1)}" y2="${h}" stroke="#FFFFFF" stroke-width="0.5"/>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><clipPath id="chc${w}"><rect width="${w}" height="${h}"/></clipPath></defs>${bg}<g clip-path="url(#chc${w})">${lines}</g></svg>`;
  }

  if (type === 'WOVEN') {
    const spacing = Math.max(lmap(density, 1, 10, 4, 1), 0.8);
    let lines = '';
    for (let cy = spacing; cy < h; cy += spacing) {
      lines += `<line x1="0" y1="${cy.toFixed(1)}" x2="${w}" y2="${cy.toFixed(1)}" stroke="#FFFFFF" stroke-width="0.5"/>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${bg}${lines}</svg>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${bg}</svg>`;
}
