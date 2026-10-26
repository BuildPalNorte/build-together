import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';
import { toDirectUrl } from './lib/db/urls';

config({ path: '.env.local' });

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: toDirectUrl(process.env.DATABASE_URL ?? '') },
});
