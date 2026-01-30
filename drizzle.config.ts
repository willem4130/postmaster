import type { Config } from 'drizzle-kit'

export default {
  schema: './src/main/database/schema.ts',
  out: './drizzle/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: './postmaster.db',
  },
} satisfies Config
