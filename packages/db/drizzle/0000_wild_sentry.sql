CREATE TYPE "public"."membership_status" AS ENUM('active', 'invited', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('owner', 'admin', 'agent', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."tenant_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."integration_kind" AS ENUM('erp', 'mail', 'ai');--> statement-breakpoint
CREATE TYPE "public"."integration_status" AS ENUM('active', 'disabled', 'error');--> statement-breakpoint
CREATE TYPE "public"."risk" AS ENUM('ok', 'warn', 'danger');--> statement-breakpoint
CREATE TYPE "public"."stock_state" AS ENUM('ok', 'low', 'out');--> statement-breakpoint
CREATE TYPE "public"."ai_status" AS ENUM('none', 'pending', 'analyzing', 'ready', 'risk', 'info', 'answered', 'failed');--> statement-breakpoint
CREATE TYPE "public"."email_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TYPE "public"."thread_status" AS ENUM('inbox', 'answered', 'other');--> statement-breakpoint
CREATE TYPE "public"."analysis_status" AS ENUM('ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."quote_draft_status" AS ENUM('draft', 'approved', 'discarded');--> statement-breakpoint
CREATE TYPE "public"."quote_status" AS ENUM('queued', 'sent', 'failed');--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "role" DEFAULT 'agent' NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "role" DEFAULT 'agent' NOT NULL,
	"status" "membership_status" DEFAULT 'active' NOT NULL,
	"token_valid_after" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_tenant_user_uniq" UNIQUE("tenant_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"family_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"device" text,
	"ip" text,
	"user_agent" text,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"replaced_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" "tenant_status" DEFAULT 'active' NOT NULL,
	"settings" jsonb DEFAULT '{"locale":"tr","currency":"TRY"}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "catalog_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"unit" text DEFAULT 'adet' NOT NULL,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_items_tenant_sku_uniq" UNIQUE("tenant_id","sku")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"erp_code" text NOT NULL,
	"name" text NOT NULL,
	"segment" text,
	"balance_minor" bigint DEFAULT 0 NOT NULL,
	"credit_limit_minor" bigint DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'TRY' NOT NULL,
	"payment_term" text,
	"last_order_at" timestamp with time zone,
	"risk" "risk" DEFAULT 'ok' NOT NULL,
	"synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_tenant_code_uniq" UNIQUE("tenant_id","erp_code")
);
--> statement-breakpoint
CREATE TABLE "integration_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"integration_id" uuid NOT NULL,
	"ciphertext" text NOT NULL,
	"iv" text NOT NULL,
	"auth_tag" text NOT NULL,
	"dek_wrapped" text NOT NULL,
	"kek_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"kind" "integration_kind" NOT NULL,
	"adapter" text NOT NULL,
	"name" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "integration_status" DEFAULT 'active' NOT NULL,
	"last_sync_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"sku" text NOT NULL,
	"customer_code" text,
	"list_minor" bigint NOT NULL,
	"deal_minor" bigint NOT NULL,
	"currency" text DEFAULT 'TRY' NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"sku" text NOT NULL,
	"qty" integer NOT NULL,
	"state" "stock_state" NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"filename_display" text NOT NULL,
	"storage_key" text NOT NULL,
	"mime" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"scanned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_customer_map" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contact_email" text NOT NULL,
	"customer_id" uuid NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contact_customer_map_tenant_email_uniq" UNIQUE("tenant_id","contact_email")
);
--> statement-breakpoint
CREATE TABLE "email_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"provider" text DEFAULT 'imap-smtp' NOT NULL,
	"address" text NOT NULL,
	"inbound_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"smtp_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"credential_id" uuid,
	"status" text DEFAULT 'active' NOT NULL,
	"last_sync_at" timestamp with time zone,
	"sync_cursor" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"thread_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"direction" "email_direction" NOT NULL,
	"message_id" text NOT NULL,
	"in_reply_to" text,
	"references" text[],
	"from" jsonb NOT NULL,
	"to" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"subject" text NOT NULL,
	"snippet" text DEFAULT '' NOT NULL,
	"body_text" text DEFAULT '' NOT NULL,
	"body_html" text,
	"received_at" timestamp with time zone NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"ai_status" "ai_status" DEFAULT 'none' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_messages_account_message_uniq" UNIQUE("account_id","message_id")
);
--> statement-breakpoint
CREATE TABLE "email_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"subject" text NOT NULL,
	"customer_id" uuid,
	"status" "thread_status" DEFAULT 'inbox' NOT NULL,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"message_count" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"model" text NOT NULL,
	"prompt_version" text NOT NULL,
	"summary" text NOT NULL,
	"intents" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"lines" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"draft_text" text DEFAULT '' NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"status" "analysis_status" DEFAULT 'ready' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_analyses_message_uniq" UNIQUE("message_id")
);
--> statement-breakpoint
CREATE TABLE "quote_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"thread_id" uuid NOT NULL,
	"customer_id" uuid,
	"body_text" text NOT NULL,
	"lines" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"net_minor" bigint DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'TRY' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" "quote_draft_status" DEFAULT 'draft' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"draft_id" uuid NOT NULL,
	"thread_id" uuid NOT NULL,
	"number" text NOT NULL,
	"customer_id" uuid,
	"lines" jsonb NOT NULL,
	"net_minor" bigint NOT NULL,
	"currency" text DEFAULT 'TRY' NOT NULL,
	"valid_until" timestamp with time zone NOT NULL,
	"status" "quote_status" DEFAULT 'queued' NOT NULL,
	"approved_by" uuid,
	"sent_at" timestamp with time zone,
	"provider_message_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quotes_tenant_number_uniq" UNIQUE("tenant_id","number")
);
--> statement-breakpoint
CREATE TABLE "sent_replies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"quote_id" uuid NOT NULL,
	"message_id" uuid,
	"status" "quote_status" DEFAULT 'queued' NOT NULL,
	"idempotency_key" text NOT NULL,
	"provider_message_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sent_replies_idempotency_uniq" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"resource_type" text,
	"resource_id" text,
	"ip" text,
	"request_id" text,
	"before" jsonb,
	"after" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"resource_type" text,
	"resource_id" text,
	"ip" text,
	"request_id" text,
	"detail" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "invitations_tenant_idx" ON "invitations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "memberships_user_idx" ON "memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_family_idx" ON "refresh_tokens" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "integration_credentials_integration_idx" ON "integration_credentials" USING btree ("integration_id");--> statement-breakpoint
CREATE INDEX "integrations_tenant_kind_idx" ON "integrations" USING btree ("tenant_id","kind");--> statement-breakpoint
CREATE INDEX "price_entries_tenant_sku_idx" ON "price_entries" USING btree ("tenant_id","sku");--> statement-breakpoint
CREATE INDEX "stock_snapshots_tenant_sku_idx" ON "stock_snapshots" USING btree ("tenant_id","sku","captured_at");--> statement-breakpoint
CREATE INDEX "attachments_message_idx" ON "attachments" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "email_accounts_tenant_idx" ON "email_accounts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "email_messages_thread_idx" ON "email_messages" USING btree ("thread_id","received_at");--> statement-breakpoint
CREATE INDEX "email_threads_tenant_status_idx" ON "email_threads" USING btree ("tenant_id","status","last_message_at");--> statement-breakpoint
CREATE INDEX "quote_drafts_thread_idx" ON "quote_drafts" USING btree ("thread_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quotes_thread_active_uniq" ON "quotes" USING btree ("thread_id") WHERE status in ('queued','sent');--> statement-breakpoint
CREATE INDEX "audit_logs_tenant_idx" ON "audit_logs" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "platform_audit_logs_created_idx" ON "platform_audit_logs" USING btree ("created_at");