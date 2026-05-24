-- CreateEnum
CREATE TYPE "test_case_priority" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "test_type" AS ENUM ('FUNCTIONAL', 'INTEGRATION', 'E2E', 'PERFORMANCE', 'SECURITY', 'USABILITY', 'OTHER');

-- CreateEnum
CREATE TYPE "test_technique" AS ENUM ('EQUIVALENCE_PARTITIONING', 'BOUNDARY_VALUE_ANALYSIS', 'DECISION_TABLE', 'STATE_TRANSITION', 'EXPLORATORY', 'REGRESSION', 'OTHER');

-- CreateTable
CREATE TABLE "test_cases" (
    "id" BIGSERIAL NOT NULL,
    "test_spec_id" BIGINT NOT NULL,
    "section_id" BIGINT,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "preconditions" TEXT,
    "priority" "test_case_priority" NOT NULL DEFAULT 'MEDIUM',
    "test_type" "test_type" NOT NULL DEFAULT 'FUNCTIONAL',
    "test_technique" "test_technique" NOT NULL DEFAULT 'OTHER',
    "is_matrix" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_cases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "test_cases_test_spec_id_idx" ON "test_cases"("test_spec_id");

-- CreateIndex
CREATE INDEX "test_cases_section_id_idx" ON "test_cases"("section_id");

-- CreateIndex
CREATE INDEX "test_cases_priority_idx" ON "test_cases"("priority");

-- CreateIndex
CREATE INDEX "test_cases_test_type_idx" ON "test_cases"("test_type");

-- CreateIndex
CREATE INDEX "test_cases_sort_order_idx" ON "test_cases"("sort_order");

-- AddForeignKey
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_test_spec_id_fkey" FOREIGN KEY ("test_spec_id") REFERENCES "test_specs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "test_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
