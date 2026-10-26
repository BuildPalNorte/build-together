import { and, desc, eq, sql } from 'drizzle-orm';
import type { Db } from '../db/client';
import { connections, events, participants } from '../db/schema';
import type { PublicConnection, PublicParticipant } from '../events/types';
import { findTopMatches } from './engine';

export interface RegisterParams {
  eventSlug: string;
  displayName: string;
  discipline: string;
  skills: string[];
  interests: string[];
  visitorId: string;
}

export interface RegisterResult {
  participant: PublicParticipant;
  matches: PublicConnection[];
  created: boolean;
}

export class EventNotFoundError extends Error {
  constructor(slug: string) {
    super(`Event not found: ${slug}`);
  }
}

function toPublicParticipant(p: typeof participants.$inferSelect): PublicParticipant {
  return {
    id: p.id,
    displayName: p.displayName,
    discipline: p.discipline,
    skills: p.skills,
    interests: p.interests,
    createdAt: p.createdAt.toISOString(),
  };
}

function toPublicConnection(c: typeof connections.$inferSelect): PublicConnection {
  return {
    id: c.id,
    sourceId: c.sourceId,
    targetId: c.targetId,
    score: c.score,
    reason: c.reason,
    createdAt: c.createdAt.toISOString(),
  };
}

/**
 * Registers a participant and its top matches in a single transaction.
 * An advisory lock on the event serializes concurrent joins, so the
 * (event_id, created_at) unique indexes get strictly increasing timestamps.
 */
export async function registerParticipant(db: Db, params: RegisterParams): Promise<RegisterResult> {
  return db.transaction(async (tx) => {
    const [event] = await tx.select().from(events).where(eq(events.slug, params.eventSlug)).limit(1);
    if (!event) throw new EventNotFoundError(params.eventSlug);

    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${event.id}, 0))`);

    const [existing] = await tx
      .select()
      .from(participants)
      .where(and(eq(participants.eventId, event.id), eq(participants.visitorId, params.visitorId)))
      .limit(1);
    if (existing) {
      const rows = await tx.select().from(connections).where(eq(connections.eventId, event.id));
      return {
        participant: toPublicParticipant(existing),
        matches: rows
          .filter((c) => c.sourceId === existing.id || c.targetId === existing.id)
          .map(toPublicConnection),
        created: false,
      };
    }

    const others = await tx.select().from(participants).where(eq(participants.eventId, event.id));

    const lastParticipantAt = others.reduce((max, o) => Math.max(max, o.createdAt.getTime()), 0);
    const participantAt = new Date(Math.max(Date.now(), lastParticipantAt + 1));

    const [inserted] = await tx
      .insert(participants)
      .values({
        eventId: event.id,
        displayName: params.displayName,
        discipline: params.discipline,
        skills: params.skills,
        interests: params.interests,
        goal: '',
        visitorId: params.visitorId,
        createdAt: participantAt,
      })
      .returning();

    const matches = findTopMatches(
      { id: inserted.id, discipline: inserted.discipline, skills: inserted.skills, interests: inserted.interests },
      others.map((o) => ({ id: o.id, discipline: o.discipline, skills: o.skills, interests: o.interests })),
    );

    let insertedConnections: PublicConnection[] = [];
    if (matches.length > 0) {
      const [lastC] = await tx
        .select({ at: connections.createdAt })
        .from(connections)
        .where(eq(connections.eventId, event.id))
        .orderBy(desc(connections.createdAt))
        .limit(1);
      let cursor = Math.max(Date.now(), (lastC?.at.getTime() ?? 0) + 1);
      const rows = await tx
        .insert(connections)
        .values(
          matches.map((m) => ({
            eventId: event.id,
            sourceId: m.sourceId,
            targetId: m.targetId,
            score: m.score,
            reason: m.reason,
            createdAt: new Date(cursor++),
          })),
        )
        .onConflictDoNothing()
        .returning();
      insertedConnections = rows.map(toPublicConnection);
    }

    return { participant: toPublicParticipant(inserted), matches: insertedConnections, created: true };
  });
}
