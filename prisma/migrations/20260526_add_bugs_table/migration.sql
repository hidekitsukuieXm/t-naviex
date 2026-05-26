-- CreateEnum
CREATE TYPE "bug_type" AS ENUM ('BUG', 'FEATURE', 'INQUIRY', 'TASK', 'IMPROVEMENT');

-- CreateEnum
CREATE TYPE "bug_priority" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "bug_severity" AS ENUM ('BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'TRIVIAL');

-- CreateEnum
CREATE TYPE "bug_status" AS ENUM ('NEW', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'VERIFIED', 'CLOSED', 'REJECTED', 'DEFERRED');

-- CreateTable
CREATE TABLE "bugs" (
    "id" BIGSERIAL NOT NULL,
    "project_id" BIGINT NOT NULL,
    "parent_bug_id" BIGINT,
    "test_result_id" BIGINT,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "type" "bug_type" NOT NULL DEFAULT 'BUG',
    "status" "bug_status" NOT NULL DEFAULT 'NEW',
    "priority" "bug_priority" NOT NULL DEFAULT 'MEDIUM',
    "severity" "bug_severity" NOT NULL DEFAULT 'MAJOR',
    "assignee_id" BIGINT,
    "reporter_id" BIGINT NOT NULL,
    "steps_to_reproduce" TEXT,
    "expected_result" TEXT,
    "actual_result" TEXT,
    "environment" VARCHAR(500),
    "version" VARCHAR(100),
    "fixed_version" VARCHAR(100),
    "due_date" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "external_id" VARCHAR(100),
    "external_url" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bugs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bugs_project_id_idx" ON "bugs"("project_id");

-- CreateIndex
CREATE INDEX "bugs_parent_bug_id_idx" ON "bugs"("parent_bug_id");

-- CreateIndex
CREATE INDEX "bugs_test_result_id_idx" ON "bugs"("test_result_id");

-- CreateIndex
CREATE INDEX "bugs_assignee_id_idx" ON "bugs"("assignee_id");

-- CreateIndex
CREATE INDEX "bugs_reporter_id_idx" ON "bugs"("reporter_id");

-- CreateIndex
CREATE INDEX "bugs_status_idx" ON "bugs"("status");

-- CreateIndex
CREATE INDEX "bugs_priority_idx" ON "bugs"("priority");

-- CreateIndex
CREATE INDEX "bugs_type_idx" ON "bugs"("type");

-- CreateIndex
CREATE INDEX "bugs_created_at_idx" ON "bugs"("created_at");

-- AddForeignKey
ALTER TABLE "bugs" ADD CONSTRAINT "bugs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bugs" ADD CONSTRAINT "bugs_parent_bug_id_fkey" FOREIGN KEY ("parent_bug_id") REFERENCES "bugs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bugs" ADD CONSTRAINT "bugs_test_result_id_fkey" FOREIGN KEY ("test_result_id") REFERENCES "test_results"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bugs" ADD CONSTRAINT "bugs_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bugs" ADD CONSTRAINT "bugs_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
