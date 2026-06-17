DO $$ 
BEGIN
    -- Add column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='created_by_owner_id') THEN
        ALTER TABLE "tenants" ADD COLUMN "created_by_owner_id" integer;
    END IF;

    -- Add constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name='tenants_created_by_owner_id_users_id_fk') THEN
        ALTER TABLE "tenants" 
        ADD CONSTRAINT "tenants_created_by_owner_id_users_id_fk" 
        FOREIGN KEY ("created_by_owner_id") REFERENCES "public"."users"("id") 
        ON DELETE no action ON UPDATE no action;
    END IF;
END $$;