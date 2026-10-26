/** Discipline colors from docs/design.md › The node. `glow` is an RGB triple used at several alphas. */
export const DISCIPLINE_HUES: Record<string, { core: string; glow: string }> = {
  'Sistemas Computacionales': { core: '#0e171c', glow: '112, 176, 204' },
  Industrial: { core: '#1a130c', glow: '214, 156, 92' },
  Mecatrónica: { core: '#171120', glow: '168, 128, 214' },
  Electrónica: { core: '#1a170c', glow: '214, 194, 108' },
  Civil: { core: '#0e141f', glow: '110, 150, 214' },
  Ambiental: { core: '#0d1a13', glow: '104, 192, 140' },
  Química: { core: '#1e1016', glow: '214, 118, 148' },
  'Administración / Negocios': { core: '#1a120e', glow: '214, 144, 118' },
  Otra: { core: '#141416', glow: '170, 170, 180' },
};

export function hueOf(discipline: string) {
  return DISCIPLINE_HUES[discipline] ?? DISCIPLINE_HUES.Otra;
}

/** Canvas colors that depend on the color scheme. Everything else on the canvas is scheme-independent. */
export interface CanvasScheme {
  paper: string;
  ring: string;
  threadStrong: string;
  threadStrongContrast: string;
  threadWeak: string;
  threadWeakContrast: string;
  threadDim: string;
}

export const DARK_SCHEME: CanvasScheme = {
  paper: '#f5f5f7',
  ring: 'rgba(245,245,247,0.55)',
  threadStrong: 'rgba(244,240,230,0.72)',
  threadStrongContrast: 'rgba(255,255,255,0.92)',
  threadWeak: 'rgba(255,255,255,0.16)',
  threadWeakContrast: 'rgba(255,255,255,0.38)',
  threadDim: 'rgba(255,255,255,0.06)',
};

export const LIGHT_SCHEME: CanvasScheme = {
  paper: '#1c1c1e',
  ring: 'rgba(28,28,30,0.55)',
  threadStrong: 'rgba(28,28,30,0.72)',
  threadStrongContrast: 'rgba(28,28,30,0.92)',
  threadWeak: 'rgba(28,28,30,0.16)',
  threadWeakContrast: 'rgba(28,28,30,0.38)',
  threadDim: 'rgba(28,28,30,0.06)',
};
