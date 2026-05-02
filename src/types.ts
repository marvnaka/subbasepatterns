export type PatternType =
  | 'EMPTY'
  | 'DOTS'
  | 'DIAGONAL'
  | 'CROSS-HATCH'
  | 'WOVEN';

export const PATTERN_TYPES: PatternType[] = [
  'EMPTY',
  'DOTS',
  'DIAGONAL',
  'CROSS-HATCH',
  'WOVEN',
];

export type FormatType = 'SQUARE' | 'LANDSCAPE';
export type ViewMode = '2D' | 'ISO';

export interface StrataConfig {
  seed: number;
  depth: number;       // 1–10
  layers: number;      // 3–12
  tension: number;     // 1–10
  density: number;     // 1–10
  patternAssignment: PatternType[];
  lineOpacity: number;     // 50–100
  thickness: number;       // 1–10
  variableWeight: boolean; // taper from thin (surface) to thick (core)
  viewMode: ViewMode;
  extrusion: number;   // 1–10, ISO only
  showDepthNumbers: boolean;
  accentLayerEnabled: boolean;
  accentLayerIndex: number; // 0-based
  format: FormatType;
}

export type PresetName = 'SURFACE SCAN' | 'DEEP CUT' | 'CORE SAMPLE' | 'ARCHIVE';
