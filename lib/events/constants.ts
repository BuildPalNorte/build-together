export const DEFAULT_EVENT_SLUG = 'tec-matamoros-2026';
export const DEFAULT_EVENT_NAME = 'Build Together — Tec de Matamoros';
export const POLL_INTERVAL_MS = 5000;

export const DISCIPLINES = [
  'Sistemas Computacionales',
  'Industrial',
  'Mecatrónica',
  'Electrónica',
  'Civil',
  'Ambiental',
  'Química',
  'Administración / Negocios',
  'Otra',
] as const;

export const SKILLS = [
  'Programación',
  'Inteligencia Artificial',
  'Diseño UX/UI',
  'Robótica',
  'Electrónica',
  'Análisis de Datos',
  'Marketing',
  'Negocios',
  'Diseño 3D',
  'Liderazgo',
  'Comunicación',
] as const;

export const INTERESTS = [
  'Inteligencia Artificial',
  'Videojuegos',
  'Robótica',
  'Aplicaciones',
  'Medio Ambiente',
  'Música',
  'Fútbol',
  'Cine',
  'Fotografía',
  'Anime',
  'Deportes',
  'Arte',
] as const;

export const STRONG_MATCH_SCORE = 8;
export const FILAMENT_SCORE = 16;

export const MAX_SKILLS = 4;
export const MAX_INTERESTS = 3;

export const DISCIPLINE_SHORT: Record<string, string> = {
  'Sistemas Computacionales': 'Sistemas',
  Industrial: 'Industrial',
  Mecatrónica: 'Mecatrónica',
  Electrónica: 'Electrónica',
  Civil: 'Civil',
  Ambiental: 'Ambiental',
  Química: 'Química',
  'Administración / Negocios': 'Negocios',
  Otra: 'Otra',
};

export type Discipline = (typeof DISCIPLINES)[number];
export type Skill = (typeof SKILLS)[number];
export type Interest = (typeof INTERESTS)[number];
