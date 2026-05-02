import type { PresetName, StrataConfig } from './types';

type PresetPartial = Omit<StrataConfig, 'seed' | 'patternAssignment' | 'lineOpacity' | 'thickness' | 'variableWeight' | 'viewMode' | 'extrusion' | 'showDepthNumbers' | 'accentLayerEnabled' | 'accentLayerIndex' | 'format'>;

export const PRESETS: Record<PresetName, PresetPartial> = {
  'SURFACE SCAN': { depth: 2, layers: 5,  tension: 4, density: 3 },
  'DEEP CUT':     { depth: 8, layers: 7,  tension: 7, density: 5 },
  'CORE SAMPLE':  { depth: 9, layers: 10, tension: 9, density: 7 },
  'ARCHIVE':      { depth: 4, layers: 12, tension: 6, density: 2 },
};

export const PRESET_NAMES: PresetName[] = [
  'SURFACE SCAN',
  'DEEP CUT',
  'CORE SAMPLE',
  'ARCHIVE',
];
