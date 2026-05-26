-- CreateEnum
CREATE TYPE "requirement_type" AS ENUM ('FUNCTIONAL', 'NON_FUNCTIONAL', 'CONSTRAINT', 'INTERFACE', 'DESIGN', 'USER_STORY');

-- CreateEnum
CREATE TYPE "requirement_status" AS ENUM ('DRAFT', 'PROPOSED', 'APPROVED', 'IMPLEMENTED', 'VERIFIED', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "requirement_priority" AS ENUM ('MUST_HAVE', 'SHOULD_HAVE', 'COULD_HAVE', 'WONT_HAVE');

-- CreateTable
CREATE TABLE "requirements" (
    "id" BIGSERIAL NOT NULL,
    "project_id" BIGINT NOT NULL,
    "parent_id" BIGINT,
    "code" VARCHAR(50) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "content" TEXT,
    "type" "requirement_type" NOT NULL DEFAULT 'FUNCTIONAL',
    "status" "requirement_status" NOT NULL DEFAULT 'DRAFT',
    "priority" "requirement_priority" NOT NULL DEFAULT 'SHOULD_HAVE',
    "version" VARCHAR(50),
    "source" VARCHAR(500),
    "rationale" TEXT,
    "acceptance" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_by_id" BIGINT NOT NULL,
    "updated_by_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_case_requirements" (
    "test_case_id" BIGINT NOT NULL,
    "requirement_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_case_requirements_pkey" PRIMARY KEY ("test_case_id","requirement_id")
);

-- CreateIndex
CREATE INDEX "requirements_project_id_idx" ON "requirements"("project_id");

-- CreateIndex
CREATE INDEX "requirements_parent_id_idx" ON "requirements"("parent_id");

-- CreateIndex
CREATE INDEX "requirements_type_idx" ON "requirements"("type");

-- CreateIndex
CREATE INDEX "requirements_status_idx" ON "requirements"("status");

-- CreateIndex
CREATE INDEX "requirements_priority_idx" ON "requirements"("priority");

-- CreateIndex
CREATE INDEX "requirements_sort_order_idx" ON "requirements"("sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "requirements_project_id_code_key" ON "requirements"("project_id", "code");

-- CreateIndex
CREATE INDEX "test_case_requirements_test_case_id_idx" ON "test_case_requirements"("test_case_id");

-- CreateIndex
CREATE INDEX "test_case_requirements_requirement_id_idx" ON "test_case_requirements"("requirement_id");

-- AddForeignKey
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "requirements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_case_requirements" ADD CONSTRAINT "test_case_requirements_test_case_id_fkey" FOREIGN KEY ("test_case_id") REFERENCES "test_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_case_requirements" ADD CONSTRAINT "test_case_requirements_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
