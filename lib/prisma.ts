// kit: ugt-nextjs-platform 4.14.0 · ugt-nextjs-database-setup/lib/prisma.ts
// kit-hash: 5f81fd7aa73c
// lib/prisma.ts — Prisma singleton for SQL Server via @prisma/adapter-mssql.
// Deps: @prisma/client, @prisma/adapter-mssql (mssql is a transitive dep — type-only import below).
// Lives at repo-root lib/ per this skill's convention — see the `@/lib/*`
// tsconfig path note in lib/env.ts.
import { PrismaClient } from '@prisma/client';
import { PrismaMssql } from '@prisma/adapter-mssql';
import type sql from 'mssql'; // type-only — NEVER a value import (breaks TS)
import { env } from '@/lib/env';

const connectionString = env.DATABASE_URL ?? '';

// Parse Prisma SQL Server URL → mssql config
// Format: sqlserver://HOST:PORT;database=DB;user=USER;password=PASS;encrypt=true;trustServerCertificate=true
function parseSqlServerUrl(url: string): sql.config {
  if (!url) return {} as sql.config; // build guard — no DB connection is made during a production build
  const withoutScheme = url.replace(/^sqlserver:\/\//, '');
  const [hostPort, ...params] = withoutScheme.split(';');
  const [server, portStr] = hostPort.split(':');
  const pairs = Object.fromEntries(
    params.map((p) => {
      const idx = p.indexOf('=');
      return [p.slice(0, idx).toLowerCase(), p.slice(idx + 1)];
    })
  );
  return {
    server,
    port: portStr ? Number.parseInt(portStr, 10) : 1433,
    database: pairs['database'],
    user: pairs['user'],
    password: pairs['password'],
    options: {
      encrypt: pairs['encrypt'] === 'true',
      trustServerCertificate: pairs['trustservercertificate'] === 'true',
    },
    // ugt-voicecare decision (2026-09-02): no stored procedures / linked
    // server in this app — kept at the mssql library default (15s) instead
    // of the kit's usual 5-minute SP allowance. Raise this if a future chunk
    // introduces long-running `EXEC usp_*` calls.
    requestTimeout: 15 * 1000,
  };
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  const config = parseSqlServerUrl(connectionString);
  const adapter = new PrismaMssql(config);
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
