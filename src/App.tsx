import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { StrataConfig, PatternType, PresetName } from './types';
import { PATTERN_TYPES } from './types';
import { Sidebar } from './Sidebar';
import { StrataCanvas, exportSVGString } from './StrataCanvas';
import { IsoCanvas, exportISOSVGString } from './IsoCanvas';
import { PRESETS } from './presets';
import { makeRng } from './prng';

function initPatternAssignment(layers: number, seed: number): PatternType[] {
  const rng = makeRng(seed ^ 0xf00d);
  return Array.from({ length: layers }, () => {
    return PATTERN_TYPES[Math.floor(rng.next() * PATTERN_TYPES.length)];
  });
}

function getInitialConfig(): StrataConfig {
  const seed = 4821;
  const layers = 7;
  return {
    seed,
    depth: 5,
    layers,
    tension: 5,
    density: 5,
    patternAssignment: initPatternAssignment(layers, seed),
    lineOpacity: 100,
    viewMode: '2D',
    extrusion: 5,
    showDepthNumbers: true,
    accentLayerEnabled: false,
    accentLayerIndex: 0,
    format: 'LANDSCAPE',
  };
}

function getCanvasDimensions(
  format: 'SQUARE' | 'LANDSCAPE',
  containerWidth: number,
  containerHeight: number,
) {
  if (format === 'SQUARE') {
    const size = Math.min(containerWidth, containerHeight);
    return { width: size, height: size };
  }
  const fromWidth  = { w: containerWidth,  h: Math.round(containerWidth  * 9 / 16) };
  const fromHeight = { w: Math.round(containerHeight * 16 / 9), h: containerHeight };
  if (fromWidth.h <= containerHeight) return { width: fromWidth.w,  height: fromWidth.h  };
  return                                      { width: fromHeight.w, height: fromHeight.h };
}

function downloadBlob(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [config, setConfig]           = useState<StrataConfig>(getInitialConfig);
  const [activePreset, setActivePreset] = useState<PresetName | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);
  const flatSvgRef   = useRef<SVGSVGElement>(null);
  const isoSvgRef    = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { width: canvasWidth, height: canvasHeight } = useMemo(
    () => getCanvasDimensions(config.format, containerSize.width, containerSize.height),
    [config.format, containerSize],
  );

  // Composition + appearance changes — clears active preset highlight.
  const handleChange = useCallback((next: StrataConfig) => {
    setConfig(next);
    setActivePreset(null);
  }, []);

  // View-only changes (viewMode, extrusion) — preserve preset highlight.
  const handleViewChange = useCallback((changes: Partial<StrataConfig>) => {
    setConfig(prev => ({ ...prev, ...changes }));
  }, []);

  const handlePreset = useCallback((name: PresetName) => {
    const preset = PRESETS[name];
    setConfig((prev) => {
      const newLayers = preset.layers;
      const pa = initPatternAssignment(newLayers, prev.seed);
      return {
        ...prev,
        ...preset,
        patternAssignment: pa,
        accentLayerIndex: Math.min(prev.accentLayerIndex, newLayers - 1),
      };
    });
    setActivePreset(name);
  }, []);

  const handleExportSVG = useCallback(() => {
    const svgStr = config.viewMode === 'ISO'
      ? exportISOSVGString(config, canvasWidth, canvasHeight)
      : exportSVGString(config, canvasWidth, canvasHeight);
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    downloadBlob(URL.createObjectURL(blob), `subbase-strata-${config.seed}.svg`);
  }, [config, canvasWidth, canvasHeight]);

  const handleExportPNG = useCallback(() => {
    const scale = 2;
    const w = canvasWidth * scale;
    const h = canvasHeight * scale;
    const svgStr = config.viewMode === 'ISO'
      ? exportISOSVGString(config, w, h)
      : exportSVGString(config, w, h);
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((pngBlob) => {
        if (!pngBlob) return;
        downloadBlob(URL.createObjectURL(pngBlob), `subbase-strata-${config.seed}.png`);
      }, 'image/png');
    };
    img.src = url;
  }, [config, canvasWidth, canvasHeight]);

  return (
    <div
      style={{
        display: 'flex',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#050505',
      }}
    >
      <Sidebar
        config={config}
        activePreset={activePreset}
        onChange={handleChange}
        onViewChange={handleViewChange}
        onPreset={handlePreset}
        onExportSVG={handleExportSVG}
        onExportPNG={handleExportPNG}
        canvasHeight={canvasHeight}
      />
      <div
        ref={containerRef}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#050505',
          overflow: 'hidden',
        }}
      >
        {config.viewMode === 'ISO' ? (
          <IsoCanvas
            ref={isoSvgRef}
            config={config}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
          />
        ) : (
          <StrataCanvas
            ref={flatSvgRef}
            config={config}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
          />
        )}
      </div>
    </div>
  );
}
