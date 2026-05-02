import React, { useCallback } from 'react';
import type { StrataConfig, PresetName, FormatType, ViewMode } from './types';
import { PATTERN_TYPES } from './types';
import { PRESET_NAMES } from './presets';
import { getSwatchSVG } from './patterns';
import { makeRng } from './prng';
import { calculateLayerPositions } from './composition';

interface SidebarProps {
  config: StrataConfig;
  activePreset: PresetName | null;
  onChange: (next: StrataConfig) => void;
  onViewChange: (changes: Partial<StrataConfig>) => void;
  onPreset: (name: PresetName) => void;
  onExportSVG: () => void;
  onExportPNG: () => void;
  canvasHeight: number;
}

const LABEL_STYLE: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 8,
  color: '#3A3A3A',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
};

const VALUE_STYLE: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 9,
  color: '#C8C8C0',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
};

const BORDER = '0.5px solid #1C1C1C';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderBottom: BORDER }}>
      <div
        style={{
          ...LABEL_STYLE,
          padding: '6px 12px',
          borderBottom: BORDER,
          color: '#2A2A2A',
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: '8px 12px',
        borderBottom: BORDER,
      }}
    >
      {children}
    </div>
  );
}

function SliderRow({
  label,
  sublabel,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  sublabel?: string;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <Row>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={LABEL_STYLE}>{label}</span>
        <span style={VALUE_STYLE}>{value}</span>
      </div>
      {sublabel && (
        <div style={{ ...LABEL_STYLE, color: '#2A2A2A', fontSize: 7 }}>{sublabel}</div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: '100%',
          accentColor: '#3A3A3A',
          margin: 0,
        }}
      />
    </Row>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 12px',
        borderBottom: BORDER,
      }}
    >
      <span style={LABEL_STYLE}>{label}</span>
      <button
        onClick={() => onChange(!value)}
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 9,
          letterSpacing: '0.08em',
          textTransform: 'uppercase' as const,
          color: value ? '#C8C8C0' : '#3A3A3A',
          background: 'none',
          border: `0.5px solid ${value ? '#3A3A3A' : '#1C1C1C'}`,
          padding: '2px 8px',
          cursor: 'pointer',
          borderRadius: 0,
        }}
      >
        {value ? 'ON' : 'OFF'}
      </button>
    </div>
  );
}

export function Sidebar({
  config,
  activePreset,
  onChange,
  onViewChange,
  onPreset,
  onExportSVG,
  onExportPNG,
  canvasHeight,
}: SidebarProps) {
  const update = useCallback(
    (partial: Partial<StrataConfig>) => onChange({ ...config, ...partial }),
    [config, onChange],
  );

  const handleDepthChange = (v: number) => update({ depth: v });
  const handleLayersChange = (v: number) => {
    const newLayers = v;
    // Resize pattern assignment
    const pa = [...config.patternAssignment];
    const rng = makeRng(config.seed ^ 0xf00d);
    while (pa.length < newLayers) {
      pa.push(PATTERN_TYPES[Math.floor(rng.next() * PATTERN_TYPES.length)]);
    }
    const newPA = pa.slice(0, newLayers);
    const newAccentIdx = Math.min(config.accentLayerIndex, newLayers - 1);
    update({ layers: newLayers, patternAssignment: newPA, accentLayerIndex: newAccentIdx });
  };
  const handleTensionChange = (v: number) => update({ tension: v });
  const handleDensityChange = (v: number) => update({ density: v });

  const cyclePattern = (idx: number) => {
    const pa = [...config.patternAssignment];
    const current = pa[idx];
    const currentIdx = PATTERN_TYPES.indexOf(current);
    pa[idx] = PATTERN_TYPES[(currentIdx + 1) % PATTERN_TYPES.length];
    update({ patternAssignment: pa });
  };

  // Depth sublabel: SURFACE gap → CORE gap
  const { gaps } = calculateLayerPositions(
    config.layers,
    config.depth,
    config.tension,
    config.seed,
    canvasHeight,
  );
  const surfaceGap = gaps.length > 0 ? Math.round(gaps[0]) : 0;
  const coreGap = gaps.length > 1 ? Math.round(gaps[gaps.length - 1]) : 0;
  const depthSublabel = `SURFACE — ${surfaceGap}PX → CORE — ${coreGap}PX`;

  return (
    <div
      style={{
        width: 260,
        minWidth: 260,
        maxWidth: 260,
        height: '100vh',
        background: '#0A0A0A',
        borderRight: BORDER,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          height: 24,
          minHeight: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          borderBottom: BORDER,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            ...LABEL_STYLE,
            fontSize: 7,
            color: '#C8C8C0',
          }}
        >
          SUBBASE — STRATA GENERATOR
        </span>
        <button
          onClick={() => {
            const newSeed = Math.floor(Math.random() * 9000) + 1000;
            update({ seed: newSeed });
          }}
          style={{
            ...LABEL_STYLE,
            fontSize: 7,
            color: '#3A3A3A',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
          }}
          title="Click to regenerate seed"
        >
          SEED {config.seed}
        </button>
      </div>

      {/* Presets */}
      <div
        style={{
          display: 'flex',
          flexShrink: 0,
          borderBottom: BORDER,
        }}
      >
        {PRESET_NAMES.map((name) => {
          const active = activePreset === name;
          return (
            <button
              key={name}
              onClick={() => onPreset(name)}
              style={{
                flex: 1,
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 7,
                letterSpacing: '0.08em',
                textTransform: 'uppercase' as const,
                color: active ? '#C8C8C0' : '#3A3A3A',
                background: 'none',
                border: 'none',
                borderRight: BORDER,
                borderBottom: `0.5px solid ${active ? '#3A3A3A' : 'transparent'}`,
                padding: '6px 2px',
                cursor: 'pointer',
                borderRadius: 0,
                textAlign: 'center' as const,
                lineHeight: 1.2,
              }}
            >
              {name}
            </button>
          );
        })}
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {/* STRUCTURE */}
        <Section title="§ STRUCTURE">
          <SliderRow
            label="§ 01 — DEPTH"
            sublabel={depthSublabel}
            min={1}
            max={10}
            value={config.depth}
            onChange={handleDepthChange}
          />
          <SliderRow
            label="§ 02 — LAYERS"
            min={3}
            max={12}
            value={config.layers}
            onChange={handleLayersChange}
          />
          <SliderRow
            label="§ 03 — TENSION"
            min={1}
            max={10}
            value={config.tension}
            onChange={handleTensionChange}
          />
        </Section>

        {/* PATTERN */}
        <Section title="§ PATTERN">
          <SliderRow
            label="§ 04 — DENSITY"
            min={1}
            max={10}
            value={config.density}
            onChange={handleDensityChange}
          />
          <SliderRow
            label="§ — THICKNESS"
            min={1}
            max={10}
            value={config.thickness}
            onChange={(v) => update({ thickness: v })}
          />
          <Toggle
            label="§ — VARIABLE WEIGHT"
            value={config.variableWeight}
            onChange={(v) => update({ variableWeight: v })}
          />

          {/* Pattern Assignment */}
          <div style={{ padding: '6px 0' }}>
            <div
              style={{
                ...LABEL_STYLE,
                padding: '4px 12px 4px 12px',
                fontSize: 7,
                color: '#2A2A2A',
              }}
            >
              § 05 — PATTERN ASSIGNMENT
            </div>
            {config.patternAssignment.map((pat, i) => {
              const isCore = i === config.layers - 1;
              const swatchSvg = getSwatchSVG(pat, config.density, config.seed ^ (i * 0x1a2b3c4d));
              const swatchDataUrl = `data:image/svg+xml,${encodeURIComponent(swatchSvg)}`;
              return (
                <div
                  key={i}
                  onClick={() => cyclePattern(i)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 12px',
                    borderBottom: BORDER,
                    cursor: 'pointer',
                    gap: 8,
                  }}
                >
                  <span style={{ ...LABEL_STYLE, fontSize: 7, color: '#2A2A2A', whiteSpace: 'nowrap' }}>
                    {isCore ? '— CORE —' : `LAYER ${i + 1}`}
                  </span>
                  <span style={{ ...VALUE_STYLE, fontSize: 8, flex: 1, textAlign: 'right' as const }}>
                    {pat}
                  </span>
                  <img
                    src={swatchDataUrl}
                    width={20}
                    height={8}
                    style={{ display: 'block', border: '0.5px solid #1C1C1C', flexShrink: 0 }}
                    alt=""
                  />
                </div>
              );
            })}
          </div>
        </Section>

        {/* DISPLAY */}
        <Section title="§ DISPLAY">
          <SliderRow
            label="§ — OPACITY"
            min={50}
            max={100}
            value={config.lineOpacity}
            onChange={(v) => update({ lineOpacity: v })}
          />
          {/* § 10 — VIEW MODE */}
          <div style={{ padding: '8px 12px', borderBottom: BORDER }}>
            <span style={{ ...LABEL_STYLE, display: 'block', marginBottom: 6 }}>§ 10 — VIEW MODE</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['2D', 'ISO'] as ViewMode[]).map((m) => {
                const active = config.viewMode === m;
                return (
                  <button
                    key={m}
                    onClick={() => onViewChange({ viewMode: m })}
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 9,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase' as const,
                      color: active ? '#C8C8C0' : '#3A3A3A',
                      background: 'none',
                      border: `0.5px solid ${active ? '#3A3A3A' : '#1C1C1C'}`,
                      padding: '3px 14px',
                      cursor: 'pointer',
                      borderRadius: 0,
                    }}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
          {/* § 11 — EXTRUSION (ISO only) */}
          {config.viewMode === 'ISO' && (
            <SliderRow
              label="§ 11 — EXTRUSION"
              min={1}
              max={10}
              value={config.extrusion}
              onChange={(v) => onViewChange({ extrusion: v })}
            />
          )}
          <Toggle
            label="§ 06 — DEPTH NUMBERS"
            value={config.showDepthNumbers}
            onChange={(v) => update({ showDepthNumbers: v })}
          />
          <div style={{ borderBottom: BORDER }}>
            <Toggle
              label="§ 07 — ACCENT LAYER"
              value={config.accentLayerEnabled}
              onChange={(v) => update({ accentLayerEnabled: v })}
            />
            {config.accentLayerEnabled && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 12px 8px',
                  gap: 8,
                }}
              >
                <span style={LABEL_STYLE}>LAYER</span>
                <select
                  value={config.accentLayerIndex}
                  onChange={(e) => update({ accentLayerIndex: Number(e.target.value) })}
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 9,
                    letterSpacing: '0.08em',
                    color: '#C8C8C0',
                    background: '#0A0A0A',
                    border: '0.5px solid #3A3A3A',
                    padding: '2px 4px',
                    borderRadius: 0,
                    cursor: 'pointer',
                  }}
                >
                  {Array.from({ length: config.layers }, (_, i) => (
                    <option key={i} value={i}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </Section>

        {/* OUTPUT */}
        <Section title="§ OUTPUT">
          <div style={{ padding: '8px 12px', borderBottom: BORDER }}>
            <span style={{ ...LABEL_STYLE, display: 'block', marginBottom: 6 }}>§ 08 — FORMAT</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['SQUARE', 'LANDSCAPE'] as FormatType[]).map((f) => {
                const active = config.format === f;
                return (
                  <button
                    key={f}
                    onClick={() => update({ format: f })}
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 9,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase' as const,
                      color: active ? '#C8C8C0' : '#3A3A3A',
                      background: 'none',
                      border: `0.5px solid ${active ? '#3A3A3A' : '#1C1C1C'}`,
                      padding: '3px 10px',
                      cursor: 'pointer',
                      borderRadius: 0,
                    }}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ padding: '8px 12px' }}>
            <span style={{ ...LABEL_STYLE, display: 'block', marginBottom: 6 }}>§ 09 — EXPORT</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={onExportSVG}
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 9,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase' as const,
                  color: '#C8C8C0',
                  background: 'none',
                  border: '0.5px solid #3A3A3A',
                  padding: '3px 14px',
                  cursor: 'pointer',
                  borderRadius: 0,
                }}
              >
                SVG
              </button>
              <button
                onClick={onExportPNG}
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 9,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase' as const,
                  color: '#C8C8C0',
                  background: 'none',
                  border: '0.5px solid #3A3A3A',
                  padding: '3px 14px',
                  cursor: 'pointer',
                  borderRadius: 0,
                }}
              >
                PNG
              </button>
            </div>
          </div>
        </Section>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '8px 12px',
          borderTop: BORDER,
          flexShrink: 0,
        }}
      >
        <div style={{ ...LABEL_STYLE, fontSize: 7, color: '#2A2A2A', lineHeight: 1.8 }}>
          § EVERY BRAND HAS LAYERS.
        </div>
        <div style={{ ...LABEL_STYLE, fontSize: 7, color: '#2A2A2A' }}>DIG DEEP.</div>
      </div>
    </div>
  );
}
