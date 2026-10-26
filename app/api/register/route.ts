import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { EventNotFoundError, registerParticipant } from '@/lib/matching/transaction';
import { registerSchema } from '@/lib/validation/participant';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud no válida.' }, { status: 400, headers: NO_STORE });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Datos no válidos.' },
      { status: 400, headers: NO_STORE },
    );
  }

  const { eventSlug, displayName, discipline, skills, interests, visitorId } = parsed.data;
  try {
    const result = await registerParticipant(getDb(), {
      eventSlug,
      displayName,
      discipline,
      skills,
      interests,
      visitorId,
    });
    return NextResponse.json(
      { participant: result.participant, matches: result.matches },
      { status: result.created ? 201 : 200, headers: NO_STORE },
    );
  } catch (err) {
    if (err instanceof EventNotFoundError) {
      return NextResponse.json({ error: 'No encontramos este evento.' }, { status: 404, headers: NO_STORE });
    }
    console.error('register failed', err);
    return NextResponse.json(
      { error: 'No pudimos registrarte. Intenta de nuevo.' },
      { status: 500, headers: NO_STORE },
    );
  }
}
