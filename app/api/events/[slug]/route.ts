import { asc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { connections, events, participants } from '@/lib/db/schema';
import type { EventSnapshot } from '@/lib/events/types';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

export async function GET(_request: Request, ctx: RouteContext<'/api/events/[slug]'>) {
  const { slug } = await ctx.params;
  try {
    const db = getDb();
    const [event] = await db.select().from(events).where(eq(events.slug, slug)).limit(1);
    if (!event) {
      return NextResponse.json({ error: 'No encontramos este evento.' }, { status: 404, headers: NO_STORE });
    }
    const [people, links] = await Promise.all([
      db.select().from(participants).where(eq(participants.eventId, event.id)).orderBy(asc(participants.createdAt)),
      db.select().from(connections).where(eq(connections.eventId, event.id)).orderBy(asc(connections.createdAt)),
    ]);
    const snapshot: EventSnapshot = {
      event: { id: event.id, slug: event.slug, name: event.name },
      participants: people.map((p) => ({
        id: p.id,
        displayName: p.displayName,
        discipline: p.discipline,
        skills: p.skills,
        interests: p.interests,
        createdAt: p.createdAt.toISOString(),
      })),
      connections: links.map((c) => ({
        id: c.id,
        sourceId: c.sourceId,
        targetId: c.targetId,
        score: c.score,
        reason: c.reason,
        createdAt: c.createdAt.toISOString(),
      })),
    };
    return NextResponse.json(snapshot, { headers: NO_STORE });
  } catch (err) {
    console.error('snapshot failed', err);
    return NextResponse.json({ error: 'No pudimos leer la red.' }, { status: 500, headers: NO_STORE });
  }
}
