import { config } from 'dotenv';
import { Client } from 'pg';
import { DEFAULT_EVENT_NAME, DEFAULT_EVENT_SLUG } from '../lib/events/constants';
import { toDirectUrl } from '../lib/db/urls';

config({ path: '.env.local' });

const DDL = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  display_name varchar(40) NOT NULL,
  discipline text NOT NULL,
  skills jsonb NOT NULL,
  interests jsonb NOT NULL,
  goal text NOT NULL,
  visitor_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS participants_event_visitor_idx ON participants (event_id, visitor_id);
CREATE UNIQUE INDEX IF NOT EXISTS participants_event_created_idx ON participants (event_id, created_at);

CREATE TABLE IF NOT EXISTS connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  score integer NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT connections_canonical_order CHECK (source_id < target_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS connections_event_pair_idx ON connections (event_id, source_id, target_id);
CREATE UNIQUE INDEX IF NOT EXISTS connections_event_created_idx ON connections (event_id, created_at);
`;

async function main() {
  const pooled = process.env.DATABASE_URL;
  if (!pooled) throw new Error('DATABASE_URL is not set');
  const client = new Client({ connectionString: toDirectUrl(pooled) });
  await client.connect();
  try {
    await client.query(DDL);
    await client.query(
      `INSERT INTO events (slug, name) VALUES ($1, $2)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name`,
      [DEFAULT_EVENT_SLUG, DEFAULT_EVENT_NAME],
    );
    console.log(`Database ready. Event "${DEFAULT_EVENT_SLUG}" is in place.`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
