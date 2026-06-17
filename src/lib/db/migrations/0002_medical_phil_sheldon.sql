DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='verification_code') THEN
        ALTER TABLE "users" ADD COLUMN "verification_code" varchar(6);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='verification_expires') THEN
        ALTER TABLE "users" ADD COLUMN "verification_expires" timestamp;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email_verified') THEN
        ALTER TABLE "users" ADD COLUMN "email_verified" timestamp;
    END IF;
END $$;