import { randomUUID } from 'node:crypto';
import { config } from 'dotenv';
import { Client } from 'pg';
import { DISCIPLINES, INTERESTS, SKILLS } from '../lib/events/constants';
import { toDirectUrl } from '../lib/db/urls';

config({ path: '.env.local' });

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000';
const TOTAL = Number(process.env.TEST_COUNT ?? 50);
const SLUG = `concurrency-${Date.now()}`;

function pick<T>(list: readonly T[], n: number): T[] {
  const pool = [...list];
  const out: T[] = [];
  for (let i = 0; i < n; i++) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}

async function main() {
  const pooled = process.env.DATABASE_URL;
  if (!pooled) throw new Error('DATABASE_URL is not set');
  const db = new Client({ connectionString: toDirectUrl(pooled) });
  await db.connect();

  const { rows: ev } = await db.query(
    `INSERT INTO events (slug, name) VALUES ($1, 'Concurrency test') RETURNING id`,
    [SLUG],
  );
  const eventId: string = ev[0].id;

  try {
    const people = Array.from({ length: TOTAL }, (_, i) => ({
      eventSlug: SLUG,
      displayName: `Test ${i + 1}`,
      discipline: DISCIPLINES[i % DISCIPLINES.length],
      skills: pick(SKILLS, 1 + (i % 4)),
      interests: pick(INTERESTS, 1 + (i % 3)),
      consent: true,
      visitorId: randomUUID(),
    }));

    const started = Date.now();
    const results = await Promise.all(
      people.map(async (body) => {
        try {
          const res = await fetch(`${BASE_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          return { ok: res.ok, status: res.status };
        } catch {
          return { ok: false, status: 0 };
        }
      }),
    );
    const elapsed = Date.now() - started;
    const okCount = results.filter((r) => r.ok).length;

    // Idempotency: re-send the first 5 visitors.
    const replays = await Promise.all(
      people.slice(0, 5).map((body) =>
        fetch(`${BASE_URL}/api/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }).then((r) => r.ok),
      ),
    );

    const q = async (sql: string) => (await db.query(sql, [eventId])).rows[0];
    const participants = Number((await q(`SELECT count(*) c FROM participants WHERE event_id = $1`)).c);
    const dupParticipants = Number(
      (await q(`SELECT count(*) c FROM (SELECT visitor_id FROM participants WHERE event_id = $1 GROUP BY 1 HAVING count(*) > 1) t`)).c,
    );
    const edges = Number((await q(`SELECT count(*) c FROM connections WHERE event_id = $1`)).c);
    const dupEdges = Number(
      (await q(`SELECT count(*) c FROM (SELECT source_id, target_id FROM connections WHERE event_id = $1 GROUP BY 1,2 HAVING count(*) > 1) t`)).c,
    );
    const reversed = Number(
      (await q(`SELECT count(*) c FROM connections a JOIN connections b ON a.source_id = b.target_id AND a.target_id = b.source_id WHERE a.event_id = $1`)).c,
    );
    const nonCanonical = Number((await q(`SELECT count(*) c FROM connections WHERE event_id = $1 AND source_id >= target_id`)).c);
    const orphans = Number(
      (await q(
        `SELECT count(*) c FROM connections c WHERE c.event_id = $1 AND (
           NOT EXISTS (SELECT 1 FROM participants p WHERE p.id = c.source_id AND p.event_id = c.event_id) OR
           NOT EXISTS (SELECT 1 FROM participants p WHERE p.id = c.target_id AND p.event_id = c.event_id))`,
      )).c,
    );

    const checks: Array<[string, boolean, string]> = [
      ['Success rate', okCount === TOTAL, `${okCount}/${TOTAL} (${((okCount / TOTAL) * 100).toFixed(0)}%) in ${elapsed}ms`],
      ['Participants stored', participants === TOTAL, `${participants}/${TOTAL}`],
      ['Duplicate participants', dupParticipants === 0, String(dupParticipants)],
      ['Idempotent replays', replays.every(Boolean), `${replays.filter(Boolean).length}/5 ok`],
      ['Duplicate edges', dupEdges === 0, String(dupEdges)],
      ['Reversed edges', reversed === 0 && nonCanonical === 0, `${reversed} reversed, ${nonCanonical} non-canonical`],
      ['Graph consistency (no orphans)', orphans === 0, String(orphans)],
    ];
    console.log(`\nConcurrency test: ${TOTAL} simultaneous joins, ${edges} edges`);
    for (const [name, pass, detail] of checks) console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}: ${detail}`);
    if (checks.some(([, pass]) => !pass)) process.exitCode = 1;
  } finally {
    // Only removes the throwaway event created by this run (cascades to its rows).
    await db.query(`DELETE FROM events WHERE id = $1`, [eventId]);
    await db.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
