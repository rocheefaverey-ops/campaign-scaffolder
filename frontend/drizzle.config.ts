import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './server/db/schema.ts',
  out: './drizzle/migrations',
  dbCredentials: {
    host: process.env.DB_HOST!,
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_DATABASE!,
    user: process.env.DB_USERNAME!,
    password: process.env.DB_PASSWORD!,
  },
});
