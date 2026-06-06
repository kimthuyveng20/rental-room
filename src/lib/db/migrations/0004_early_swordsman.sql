ALTER TABLE "documents" DROP CONSTRAINT "documents_lease_id_leases_id_fk";
--> statement-breakpoint
ALTER TABLE "documents" DROP COLUMN "lease_id";