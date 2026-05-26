import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { hash } from 'bcryptjs';
import * as schema from '../lib/db/schema';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'local.db');
const sqlite = new Database(DB_PATH);

sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    plan TEXT NOT NULL DEFAULT 'starter',
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS org_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id TEXT NOT NULL REFERENCES organizations(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    role TEXT NOT NULL DEFAULT 'member',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS invitations (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id),
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    accepted_at TEXT
  );
`);

const db = drizzle(sqlite, { schema });

function nanoid(size = 21): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => alphabet[b % alphabet.length]).join('');
}

async function seed() {
  console.log('Seeding database...');

  const now = new Date().toISOString();

  // Clear existing demo data
  try {
    sqlite.exec(`DELETE FROM org_members WHERE org_id IN (SELECT id FROM organizations WHERE slug = 'acme')`);
    sqlite.exec(`DELETE FROM invitations WHERE org_id IN (SELECT id FROM organizations WHERE slug = 'acme')`);
    sqlite.exec(`DELETE FROM organizations WHERE slug = 'acme'`);
    sqlite.exec(`DELETE FROM users WHERE email IN ('demo@example.com', 'alice@example.com', 'bob@example.com')`);
  } catch {
    // Ignore errors if tables don't exist yet
  }

  // Create demo user (owner)
  const demoId = nanoid();
  const aliceId = nanoid();
  const bobId = nanoid();
  const orgId = nanoid();

  const [demoHash, aliceHash, bobHash] = await Promise.all([
    hash('demo1234', 12),
    hash('alice1234', 12),
    hash('bob1234', 12),
  ]);

  // Insert users
  await db.insert(schema.users).values([
    {
      id: demoId,
      email: 'demo@example.com',
      password_hash: demoHash,
      name: 'Demo User',
      created_at: now,
    },
    {
      id: aliceId,
      email: 'alice@example.com',
      password_hash: aliceHash,
      name: 'Alice Johnson',
      created_at: now,
    },
    {
      id: bobId,
      email: 'bob@example.com',
      password_hash: bobHash,
      name: 'Bob Smith',
      created_at: now,
    },
  ]);

  // Insert org
  await db.insert(schema.organizations).values({
    id: orgId,
    name: 'Acme Corp',
    slug: 'acme',
    plan: 'pro',
    created_at: now,
  });

  // Insert memberships
  await db.insert(schema.org_members).values([
    {
      org_id: orgId,
      user_id: demoId,
      role: 'owner',
      created_at: now,
    },
    {
      org_id: orgId,
      user_id: aliceId,
      role: 'admin',
      created_at: now,
    },
    {
      org_id: orgId,
      user_id: bobId,
      role: 'member',
      created_at: now,
    },
  ]);

  console.log('Seed complete!');
  console.log('  Demo login: demo@example.com / demo1234');
  console.log('  Alice login: alice@example.com / alice1234');
  console.log('  Bob login: bob@example.com / bob1234');
  console.log('  Org: Acme Corp (Pro plan)');

  sqlite.close();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
