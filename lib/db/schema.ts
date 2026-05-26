import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  name: text('name').notNull(),
  email_verified_at: text('email_verified_at'),
  totp_secret: text('totp_secret'),
  totp_enabled: integer('totp_enabled').notNull().default(0),
  totp_recovery_codes: text('totp_recovery_codes'),
  created_at: text('created_at').notNull(),
});

export const organizations = sqliteTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  plan: text('plan', { enum: ['starter', 'pro', 'enterprise'] }).notNull().default('starter'),
  stripe_customer_id: text('stripe_customer_id'),
  stripe_subscription_id: text('stripe_subscription_id'),
  created_at: text('created_at').notNull(),
});

export const org_members = sqliteTable('org_members', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  org_id: text('org_id').notNull().references(() => organizations.id),
  user_id: text('user_id').notNull().references(() => users.id),
  role: text('role', { enum: ['owner', 'admin', 'member'] }).notNull().default('member'),
  created_at: text('created_at').notNull(),
});

export const invitations = sqliteTable('invitations', {
  id: text('id').primaryKey(),
  org_id: text('org_id').notNull().references(() => organizations.id),
  email: text('email').notNull(),
  role: text('role', { enum: ['owner', 'admin', 'member'] }).notNull().default('member'),
  token: text('token').notNull().unique(),
  expires_at: text('expires_at').notNull(),
  created_at: text('created_at').notNull(),
  accepted_at: text('accepted_at'),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type OrgMember = typeof org_members.$inferSelect;
export type NewOrgMember = typeof org_members.$inferInsert;
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
