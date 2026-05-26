-- CreateEnum
CREATE TYPE "integration_type" AS ENUM ('REDMINE', 'BACKLOG', 'JIRA', 'GITHUB', 'GITLAB', 'AZURE_DEVOPS');

-- CreateTable
CREATE TABLE "external_integrations" (
    "id" BIGSERIAL NOT NULL,
    "project_id" BIGINT,
    "name" VARCHAR(100) NOT NULL,
    "integration_type" "integration_type" NOT NULL,
    "base_url" VARCHAR(500) NOT NULL,
    "api_key_encrypted" TEXT,
    "username" VARCHAR(100),
    "password_encrypted" TEXT,
    "project_key" VARCHAR(100),
    "options" JSONB,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_tested_at" TIMESTAMP(3),
    "last_test_result" BOOLEAN,
    "last_test_error" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" BIGINT NOT NULL,
    "updated_by_id" BIGINT,

    CONSTRAINT "external_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "external_integrations_project_id_idx" ON "external_integrations"("project_id");

-- CreateIndex
CREATE INDEX "external_integrations_integration_type_idx" ON "external_integrations"("integration_type");

-- CreateIndex
CREATE INDEX "external_integrations_is_enabled_idx" ON "external_integrations"("is_enabled");

-- CreateIndex
CREATE INDEX "external_integrations_created_by_id_idx" ON "external_integrations"("created_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "external_integrations_project_id_name_key" ON "external_integrations"("project_id", "name");

-- AddForeignKey
ALTER TABLE "external_integrations" ADD CONSTRAINT "external_integrations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_integrations" ADD CONSTRAINT "external_integrations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_integrations" ADD CONSTRAINT "external_integrations_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
