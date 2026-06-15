-- 1. Create types safely if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_provider') THEN
        CREATE TYPE "public"."payment_provider" AS ENUM('cash', 'aba', 'acleda', 'wing');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_transaction_status') THEN
        CREATE TYPE "public"."payment_transaction_status" AS ENUM('pending', 'paid', 'failed', 'expired');
    END IF;
END $$;
--> statement-breakpoint

-- 2. Create table safely if it doesn't exist
CREATE TABLE IF NOT EXISTS "payment_transactions" (
    "id" serial PRIMARY KEY NOT NULL,
    "invoice_id" integer NOT NULL,
    "amount_usd" numeric(10, 2) NOT NULL,
    "amount_riel" integer,
    "provider" "payment_provider" DEFAULT 'aba' NOT NULL,
    "transaction_ref" varchar(255),
    "qr_reference" varchar(255),
    "status" "payment_transaction_status" DEFAULT 'pending' NOT NULL,
    "paid_at" timestamp,
    "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- 3. Alter tables (These will run now that the blockages are gone)
-- Note: If these fail next, you can add 'IF NOT EXISTS' to the column names if your Postgres version supports it.
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "payment_reference" varchar(255);--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "paid_at" timestamp;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "payment_screenshot" varchar(1000);--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "khqr_image_url" varchar(1000);--> statement-breakpoint

-- 4. Add the foreign key constraint safely
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_transactions_invoice_id_invoices_id_fk') THEN
        ALTER TABLE "payment_transactions" 
        ADD CONSTRAINT "payment_transactions_invoice_id_invoices_id_fk" 
        FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;