DO $$ 
BEGIN
    -- Add start_date column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='start_date') THEN
        ALTER TABLE "invoices" ADD COLUMN "start_date" date;
    END IF;

    -- Add end_date column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='end_date') THEN
        ALTER TABLE "invoices" ADD COLUMN "end_date" date;
    END IF;

    -- Optional: If you want to force these to NOT NULL after adding them
    -- Note: Ensure there is existing data or a default value before running these, 
    -- otherwise it will error if the table is not empty.
    -- EXECUTE 'ALTER TABLE "invoices" ALTER COLUMN "start_date" SET NOT NULL';
    -- EXECUTE 'ALTER TABLE "invoices" ALTER COLUMN "end_date" SET NOT NULL';
END $$;