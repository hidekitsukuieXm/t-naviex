-- CreateTable
CREATE TABLE "test_results" (
    "id" BIGSERIAL NOT NULL,
    "test_run_case_id" BIGINT NOT NULL,
    "executed_by_id" BIGINT,
    "status" "TestRunCaseStatus" NOT NULL,
    "executed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "execution_time" INTEGER,
    "actual_result" TEXT,
    "defects" TEXT,
    "comment" TEXT,
    "environment" VARCHAR(255),
    "browser_info" VARCHAR(255),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "test_results_test_run_case_id_idx" ON "test_results"("test_run_case_id");

-- CreateIndex
CREATE INDEX "test_results_executed_by_id_idx" ON "test_results"("executed_by_id");

-- CreateIndex
CREATE INDEX "test_results_status_idx" ON "test_results"("status");

-- CreateIndex
CREATE INDEX "test_results_executed_at_idx" ON "test_results"("executed_at");

-- CreateIndex
CREATE INDEX "test_results_version_idx" ON "test_results"("version");

-- AddForeignKey
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_test_run_case_id_fkey" FOREIGN KEY ("test_run_case_id") REFERENCES "test_run_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_executed_by_id_fkey" FOREIGN KEY ("executed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
