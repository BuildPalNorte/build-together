import type { Skill } from '../events/constants';

export interface MatchSubject {
  id: string;
  discipline: string;
  skills: readonly string[];
  interests: readonly string[];
}

export interface MatchResult {
  score: number;
  reason: string;
  sourceId: string;
  targetId: string;
}

export const COMPLEMENTARY_PAIRS: Array<[Skill, Skill]> = [
  ['Programación', 'Diseño UX/UI'],
  ['Programación', 'Marketing'],
  ['Electrónica', 'Programación'],
  ['Robótica', 'Diseño 3D'],
  ['Inteligencia Artificial', 'Análisis de Datos'],
  ['Programación', 'Negocios'],
  ['Inteligencia Artificial', 'Negocios'],
  ['Robótica', 'Electrónica'],
  ['Diseño UX/UI', 'Marketing'],
  ['Liderazgo', 'Programación'],
  ['Liderazgo', 'Electrónica'],
  ['Comunicación', 'Marketing'],
  ['Diseño 3D', 'Electrónica'],
  ['Análisis de Datos', 'Marketing'],
];

const PAIR_KEYS = new Set(COMPLEMENTARY_PAIRS.flatMap(([a, b]) => [`${a}|${b}`, `${b}|${a}`]));

/** Order-independent. */
export function areSkillsComplementary(a: string, b: string): boolean {
  return PAIR_KEYS.has(`${a}|${b}`);
}

const MIN_SCORE = 4;

export function calculateMatch(a: MatchSubject, b: MatchSubject): MatchResult | null {
  if (a.id === b.id) return null;

  const reasons: string[] = [];
  let score = 0;

  const bInterests = new Set(b.interests);
  const sharedInterests = a.interests.filter((i) => bInterests.has(i));
  if (sharedInterests.length > 0) {
    score += sharedInterests.length * 4;
    reasons.push(
      sharedInterests.length === 1
        ? `Ambos comparten interés en ${sharedInterests[0]}`
        : `Interés mutuo en ${sharedInterests[0]} y ${sharedInterests[1]}`,
    );
  }

  let firstPair: [string, string] | null = null;
  for (const skillA of a.skills) {
    for (const skillB of b.skills) {
      if (areSkillsComplementary(skillA, skillB)) {
        score += 3;
        firstPair ??= [skillA, skillB];
      }
    }
  }
  if (firstPair) reasons.push(`${firstPair[0]} + ${firstPair[1]}: habilidades complementarias`);

  if (a.discipline === b.discipline) {
    score += 1;
    reasons.push(`Misma disciplina en ${a.discipline}`);
  }

  if (score < MIN_SCORE) return null;

  const [sourceId, targetId] = a.id < b.id ? [a.id, b.id] : [b.id, a.id];
  return { score, reason: reasons.slice(0, 2).join(' · '), sourceId, targetId };
}

export function findTopMatches(
  newParticipant: MatchSubject,
  existing: readonly MatchSubject[],
  maxMatches = 3,
): MatchResult[] {
  const scored: Array<{ otherId: string; match: MatchResult }> = [];
  for (const other of existing) {
    const match = calculateMatch(newParticipant, other);
    if (match) scored.push({ otherId: other.id, match });
  }
  scored.sort((x, y) => y.match.score - x.match.score || x.otherId.localeCompare(y.otherId));
  return scored.slice(0, maxMatches).map((s) => s.match);
}
