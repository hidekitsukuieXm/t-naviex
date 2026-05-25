-- CreateEnum
CREATE TYPE "CaseDependencyType" AS ENUM ('BLOCKS', 'REQUIRES', 'RELATED');

-- CreateTable
CREATE TABLE "case_dependencies" (
    "id" BIGSERIAL NOT NULL,
    "test_case_id" BIGINT NOT NULL,
    "depends_on_id" BIGINT NOT NULL,
    "dependency_type" "CaseDependencyType" NOT NULL DEFAULT 'REQUIRES',
    "description" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "case_dependencies_test_case_id_idx" ON "case_dependencies"("test_case_id");

-- CreateIndex
CREATE INDEX "case_dependencies_depends_on_id_idx" ON "case_dependencies"("depends_on_id");

-- CreateIndex
CREATE INDEX "case_dependencies_dependency_type_idx" ON "case_dependencies"("dependency_type");

-- CreateIndex
CREATE UNIQUE INDEX "case_dependencies_test_case_id_depends_on_id_key" ON "case_dependencies"("test_case_id", "depends_on_id");

-- AddForeignKey
ALTER TABLE "case_dependencies" ADD CONSTRAINT "case_dependencies_test_case_id_fkey" FOREIGN KEY ("test_case_id") REFERENCES "test_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_dependencies" ADD CONSTRAINT "case_dependencies_depends_on_id_fkey" FOREIGN KEY ("depends_on_id") REFERENCES "test_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
