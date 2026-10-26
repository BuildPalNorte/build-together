export interface PublicParticipant {
  id: string;
  displayName: string;
  discipline: string;
  skills: string[];
  interests: string[];
  createdAt: string;
}

export interface PublicConnection {
  id: string;
  sourceId: string;
  targetId: string;
  score: number;
  reason: string;
  createdAt: string;
}

export interface EventSnapshot {
  event: { id: string; slug: string; name: string };
  participants: PublicParticipant[];
  connections: PublicConnection[];
}
