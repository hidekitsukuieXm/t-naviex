-- CreateEnum
CREATE TYPE "sync_direction" AS ENUM ('BIDIRECTIONAL', 'TO_EXTERNAL', 'FROM_EXTERNAL');

-- CreateEnum
CREATE TYPE "sync_status" AS ENUM ('SYNCED', 'PENDING', 'ERROR', 'CONFLICT');

-- CreateTable
CREATE TABLE "integration_status_mappings" (
    "id" BIGSERIAL NOT NULL,
    "integration_id" BIGINT NOT NULL,
    "local_status_id" BIGINT NOT NULL,
    "external_status_id" VARCHAR(100) NOT NULL,
    "external_status_name" VARCHAR(100) NOT NULL,
    "sync_direction" "sync_direction" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_status_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bug_syncs" (
    "id" BIGSERIAL NOT NULL,
    "bug_id" BIGINT NOT NULL,
    "integration_id" BIGINT NOT NULL,
    "external_issue_id" VARCHAR(100) NOT NULL,
    "external_issue_key" VARCHAR(100),
    "external_issue_url" VARCHAR(500),
    "sync_status" "sync_status" NOT NULL,
    "last_sync_at" TIMESTAMP(3) NOT NULL,
    "last_sync_direction" "sync_direction" NOT NULL,
    "last_sync_error" VARCHAR(500),
    "local_updated_at" TIMESTAMP(3) NOT NULL,
    "external_updated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bug_syncs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "integration_status_mappings_integration_id_idx" ON "integration_status_mappings"("integration_id");

-- CreateIndex
CREATE UNIQUE INDEX "integration_status_mappings_integration_id_local_status_id_key" ON "integration_status_mappings"("integration_id", "local_status_id");

-- CreateIndex
CREATE UNIQUE INDEX "integration_status_mappings_integration_id_external_status__key" ON "integration_status_mappings"("integration_id", "external_status_id");

-- CreateIndex
CREATE INDEX "bug_syncs_bug_id_idx" ON "bug_syncs"("bug_id");

-- CreateIndex
CREATE INDEX "bug_syncs_integration_id_idx" ON "bug_syncs"("integration_id");

-- CreateIndex
CREATE INDEX "bug_syncs_sync_status_idx" ON "bug_syncs"("sync_status");

-- CreateIndex
CREATE UNIQUE INDEX "bug_syncs_bug_id_integration_id_key" ON "bug_syncs"("bug_id", "integration_id");

-- CreateIndex
CREATE UNIQUE INDEX "bug_syncs_integration_id_external_issue_id_key" ON "bug_syncs"("integration_id", "external_issue_id");

-- AddForeignKey
ALTER TABLE "integration_status_mappings" ADD CONSTRAINT "integration_status_mappings_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "external_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_status_mappings" ADD CONSTRAINT "integration_status_mappings_local_status_id_fkey" FOREIGN KEY ("local_status_id") REFERENCES "bug_status_masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bug_syncs" ADD CONSTRAINT "bug_syncs_bug_id_fkey" FOREIGN KEY ("bug_id") REFERENCES "bugs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bug_syncs" ADD CONSTRAINT "bug_syncs_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "external_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
