export type PatternType =
  | 'EMPTY'
  | 'DOTS'
  | 'STIPPLE'
  | 'DIAGONAL'
  | 'CROSS-HATCH'
  | 'NOISE'
  | 'WOVEN';

export const PATTERN_TYPES: PatternType[] = [
  'EMPTY',
  'DOTS',
  'STIPPLE',
  'DIAGONAL',
  'CROSS-HATCH',
  'NOISE',
  'WOVEN',
];

export type FormatType = 'SQUARE' | 'LANDSCAPE';

export interface StrataConfig {
  seed: number;
  depth: number;       // 1–10
  layers: number;      // 3–12
  tension: number;     // 1–10
  density: number;     // 1–10
  patternAssignment: PatternType[];
  lineOpacity: number;   // 50–100
  showDepthNumbers: boolean;
  accentLayerEnabled: boolean;
  accentLayerIndex: number; // 0-based
  format: FormatType;
}

export type PresetName = 'SURFACE SCAN' | 'DEEP CUT' | 'CORE SAMPLE' | 'ARCHIVE';
