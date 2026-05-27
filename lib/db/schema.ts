import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  name: text('name').notNull(),
  avatar: text('avatar'), // base64 data URL (see file-storage note in README)
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
  logo: text('logo'), // base64 data URL
  plan: text('plan', { enum: ['starter', 'pro', 'enterprise'] }).notNull().default('starter'),
  stripe_customer_id: text('stripe_customer_id'),
  stripe_subscription_id: text('stripe_subscription_id'),
  created_at: text('created_at').notNull(),
});

export const notification_preferences = sqliteTable('notification_preferences', {
  user_id: text('user_id').primaryKey().references(() => users.id),
  product_updates: integer('product_updates').notNull().default(1),
  security_alerts: integer('security_alerts').notNull().default(1),
  team_activity: integer('team_activity').notNull().default(1),
  billing: integer('billing').notNull().default(1),
  updated_at: text('updated_at').notNull(),
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
  declined_at: text('declined_at'),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type OrgMember = typeof org_members.$inferSelect;
export type NewOrgMember = typeof org_members.$inferInsert;
export const webhook_endpoints = sqliteTable('webhook_endpoints', {
  id: text('id').primaryKey(),
  org_id: text('org_id').notNull().references(() => organizations.id),
  url: text('url').notNull(),
  secret: text('secret').notNull(),
  description: text('description'),
  events: text('events').notNull().default('*'), // comma-separated event types, or '*'
  enabled: integer('enabled').notNull().default(1),
  created_by_user_id: text('created_by_user_id').notNull().references(() => users.id),
  created_at: text('created_at').notNull(),
});

export const webhook_deliveries = sqliteTable('webhook_deliveries', {
  id: text('id').primaryKey(),
  endpoint_id: text('endpoint_id').notNull().references(() => webhook_endpoints.id),
  org_id: text('org_id').notNull().references(() => organizations.id),
  event_type: text('event_type').notNull(),
  event_id: text('event_id').notNull(),
  payload: text('payload').notNull(),
  status: text('status', { enum: ['pending', 'success', 'failed'] }).notNull().default('pending'),
  status_code: integer('status_code'),
  response_body: text('response_body'),
  error: text('error'),
  attempts: integer('attempts').notNull().default(0),
  next_retry_at: text('next_retry_at'),
  last_attempt_at: text('last_attempt_at'),
  created_at: text('created_at').notNull(),
});

export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
export type NotificationPreferences = typeof notification_preferences.$inferSelect;
export type WebhookEndpoint = typeof webhook_endpoints.$inferSelect;
export type WebhookDelivery = typeof webhook_deliveries.$inferSelect;
