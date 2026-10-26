import type { EventSnapshot, PublicConnection, PublicParticipant } from '@/lib/events/types';

export interface MatchEntry {
  link: PublicConnection;
  other: PublicParticipant;
}

export function matchesOf(snapshot: EventSnapshot | null, personId: string): MatchEntry[] {
  if (!snapshot) return [];
  const people = new Map(snapshot.participants.map((p) => [p.id, p]));
  const out: MatchEntry[] = [];
  for (const link of snapshot.connections) {
    const otherId = link.sourceId === personId ? link.targetId : link.targetId === personId ? link.sourceId : null;
    const other = otherId ? people.get(otherId) : undefined;
    if (other) out.push({ link, other });
  }
  return out.sort((a, b) => b.link.score - a.link.score || a.link.id.localeCompare(b.link.id));
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
