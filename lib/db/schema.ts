import { sql } from 'drizzle-orm';
import {
  check,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const participants = pgTable(
  'participants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    displayName: varchar('display_name', { length: 40 }).notNull(),
    discipline: text('discipline').notNull(),
    skills: jsonb('skills').$type<string[]>().notNull(),
    interests: jsonb('interests').$type<string[]>().notNull(),
    goal: text('goal').notNull(),
    visitorId: text('visitor_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('participants_event_visitor_idx').on(t.eventId, t.visitorId),
    uniqueIndex('participants_event_created_idx').on(t.eventId, t.createdAt),
  ],
);

export const connections = pgTable(
  'connections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => participants.id, { onDelete: 'cascade' }),
    targetId: uuid('target_id')
      .notNull()
      .references(() => participants.id, { onDelete: 'cascade' }),
    score: integer('score').notNull(),
    reason: text('reason').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('connections_event_pair_idx').on(t.eventId, t.sourceId, t.targetId),
    uniqueIndex('connections_event_created_idx').on(t.eventId, t.createdAt),
    check('connections_canonical_order', sql`${t.sourceId} < ${t.targetId}`),
  ],
);

export type EventRow = typeof events.$inferSelect;
export type ParticipantRow = typeof participants.$inferSelect;
export type ConnectionRow = typeof connections.$inferSelect;
