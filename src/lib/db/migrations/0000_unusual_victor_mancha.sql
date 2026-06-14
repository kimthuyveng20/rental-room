DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
        CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'pending', 'paid', 'overdue', 'cancelled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lease_status') THEN
        CREATE TYPE "public"."lease_status" AS ENUM('active', 'expired', 'terminated');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'maintenance_priority') THEN
        CREATE TYPE "public"."maintenance_priority" AS ENUM('low', 'medium', 'high', 'urgent');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'maintenance_status') THEN
        CREATE TYPE "public"."maintenance_status" AS ENUM('open', 'in_progress', 'completed');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'overdue');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'room_status') THEN
        CREATE TYPE "public"."room_status" AS ENUM('available', 'occupied', 'maintenance');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'room_type') THEN
        CREATE TYPE "public"."room_type" AS ENUM('single', 'double', 'suite');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE "public"."user_role" AS ENUM('owner', 'tenant', 'admin');
    END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "documents" (
    "id" serial PRIMARY KEY NOT NULL,
    "tenant_id" integer,
    "document_type" varchar(100) NOT NULL,
    "file_path" varchar(500) NOT NULL,
    "uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inspections" (
    "id" serial PRIMARY KEY NOT NULL,
    "room_id" integer NOT NULL,
    "inspector_id" integer NOT NULL,
    "inspection_date" date NOT NULL,
    "condition_notes" text,
    "issues_found" json DEFAULT '[]'::json,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invoices" (
    "id" serial PRIMARY KEY NOT NULL,
    "lease_id" integer NOT NULL,
    "room_number" varchar(50) NOT NULL,
    "tenant_name" varchar(255) NOT NULL,
    "water_last_month" integer NOT NULL,
    "water_this_month" integer NOT NULL,
    "water_usage" integer NOT NULL,
    "water_rate" numeric(10, 2) NOT NULL,
    "water_total" numeric(10, 2) NOT NULL,
    "electricity_last_month" integer NOT NULL,
    "electricity_this_month" integer NOT NULL,
    "electricity_usage" integer NOT NULL,
    "electricity_rate" numeric(10, 2) NOT NULL,
    "electricity_total" numeric(10, 2) NOT NULL,
    "room_rent" numeric(10, 2) NOT NULL,
    "grand_total" numeric(10, 2) NOT NULL,
    "status" "invoice_status" DEFAULT 'pending' NOT NULL,
    "billing_period" varchar(50) NOT NULL,
    "due_date" date NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "leases" (
    "id" serial PRIMARY KEY NOT NULL,
    "room_id" integer NOT NULL,
    "tenant_id" integer NOT NULL,
    "start_date" date NOT NULL,
    "end_date" date NOT NULL,
    "monthly_rent" numeric(10, 2) NOT NULL,
    "deposit_amount" numeric(10, 2) NOT NULL,
    "status" "lease_status" DEFAULT 'active' NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "maintenance_requests" (
    "id" serial PRIMARY KEY NOT NULL,
    "room_id" integer NOT NULL,
    "reported_by_user_id" integer NOT NULL,
    "title" varchar(255) NOT NULL,
    "description" text NOT NULL,
    "priority" "maintenance_priority" DEFAULT 'medium' NOT NULL,
    "status" "maintenance_status" DEFAULT 'open' NOT NULL,
    "estimated_cost" numeric(10, 2),
    "actual_cost" numeric(10, 2),
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payments" (
    "id" serial PRIMARY KEY NOT NULL,
    "lease_id" integer NOT NULL,
    "tenant_id" integer,
    "amount" numeric(10, 2) NOT NULL,
    "payment_date" date,
    "due_date" date NOT NULL,
    "status" "payment_status" DEFAULT 'pending' NOT NULL,
    "payment_method" varchar(50),
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "properties" (
    "id" serial PRIMARY KEY NOT NULL,
    "owner_id" integer NOT NULL,
    "name" varchar(255) NOT NULL,
    "address" varchar(255) NOT NULL,
    "city" varchar(100) NOT NULL,
    "state" varchar(100) NOT NULL,
    "zip" varchar(20) NOT NULL,
    "description" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rooms" (
    "id" serial PRIMARY KEY NOT NULL,
    "property_id" integer NOT NULL,
    "room_number" varchar(50) NOT NULL,
    "type" "room_type" NOT NULL,
    "capacity" integer NOT NULL,
    "price_per_month" numeric(10, 2) NOT NULL,
    "status" "room_status" DEFAULT 'available' NOT NULL,
    "amenities" json DEFAULT '[]'::json,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tenants" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" integer NOT NULL,
    "phone" varchar(20) NOT NULL,
    "emergency_contact" varchar(255),
    "employment_verification" boolean DEFAULT false,
    "image_url" varchar(512),
    "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
    "id" serial PRIMARY KEY NOT NULL,
    "email" varchar(255) NOT NULL,
    "name" varchar(255) NOT NULL,
    "password_hash" varchar(255) NOT NULL,
    "role" "user_role" DEFAULT 'tenant' NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ 
BEGIN
    ALTER TABLE "documents" ADD CONSTRAINT "documents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ 
BEGIN
    ALTER TABLE "inspections" ADD CONSTRAINT "inspections_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ 
BEGIN
    ALTER TABLE "inspections" ADD CONSTRAINT "inspections_inspector_id_users_id_fk" FOREIGN KEY ("inspector_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ 
BEGIN
    ALTER TABLE "invoices" ADD CONSTRAINT "invoices_lease_id_leases_id_fk" FOREIGN KEY ("lease_id") REFERENCES "public"."leases"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ 
BEGIN
    ALTER TABLE "leases" ADD CONSTRAINT "leases_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ 
BEGIN
    ALTER TABLE "leases" ADD CONSTRAINT "leases_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ 
BEGIN
    ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ 
BEGIN
    ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_reported_by_user_id_users_id_fk" FOREIGN KEY ("reported_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ 
BEGIN
    ALTER TABLE "payments" ADD CONSTRAINT "payments_lease_id_leases_id_fk" FOREIGN KEY ("lease_id") REFERENCES "public"."leases"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ 
BEGIN
    ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ 
BEGIN
    ALTER TABLE "properties" ADD CONSTRAINT "properties_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ 
BEGIN
    ALTER TABLE "rooms" ADD CONSTRAINT "rooms_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ 
BEGIN
    ALTER TABLE "tenants" ADD CONSTRAINT "tenants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;