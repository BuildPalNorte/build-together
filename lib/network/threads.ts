import { FILAMENT_SCORE } from '../events/constants';
import type { PublicConnection } from '../events/types';

/** Every link of FILAMENT_SCORE or more, plus each person's two best links. */
export function threadsToDraw(connections: readonly PublicConnection[]): Set<string> {
  const keep = new Set<string>();
  const byPerson = new Map<string, PublicConnection[]>();
  for (const c of connections) {
    if (c.score >= FILAMENT_SCORE) keep.add(c.id);
    for (const pid of [c.sourceId, c.targetId]) {
      const list = byPerson.get(pid);
      if (list) list.push(c);
      else byPerson.set(pid, [c]);
    }
  }
  for (const list of byPerson.values()) {
    list.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    for (const c of list.slice(0, 2)) keep.add(c.id);
  }
  return keep;
}

/** Stable sign (+1 or -1) from a hash of the link id, so a curve never flips between frames. */
export function curvatureOf(linkId: string): 1 | -1 {
  let h = 2166136261;
  for (let i = 0; i < linkId.length; i++) {
    h ^= linkId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 2 === 0 ? 1 : -1;
}
