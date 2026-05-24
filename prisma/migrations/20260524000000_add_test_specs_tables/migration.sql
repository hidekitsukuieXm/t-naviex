-- CreateEnum
CREATE TYPE "test_spec_status" AS ENUM ('DRAFT', 'REVIEW', 'APPROVED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "test_specs" (
    "id" BIGSERIAL NOT NULL,
    "project_id" BIGINT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" "test_spec_status" NOT NULL DEFAULT 'DRAFT',
    "version" VARCHAR(50) NOT NULL DEFAULT '1.0.0',
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_specs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_spec_versions" (
    "id" BIGSERIAL NOT NULL,
    "test_spec_id" BIGINT NOT NULL,
    "version" VARCHAR(50) NOT NULL,
    "change_note" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_spec_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "test_specs_project_id_idx" ON "test_specs"("project_id");

-- CreateIndex
CREATE INDEX "test_specs_status_idx" ON "test_specs"("status");

-- CreateIndex
CREATE INDEX "test_specs_created_at_idx" ON "test_specs"("created_at");

-- CreateIndex
CREATE INDEX "test_spec_versions_test_spec_id_idx" ON "test_spec_versions"("test_spec_id");

-- CreateIndex
CREATE INDEX "test_spec_versions_created_at_idx" ON "test_spec_versions"("created_at");

-- AddForeignKey
ALTER TABLE "test_specs" ADD CONSTRAINT "test_specs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_spec_versions" ADD CONSTRAINT "test_spec_versions_test_spec_id_fkey" FOREIGN KEY ("test_spec_id") REFERENCES "test_specs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
