-- CreateTable
CREATE TABLE "test_steps" (
    "id" BIGSERIAL NOT NULL,
    "test_case_id" BIGINT NOT NULL,
    "step_no" INTEGER NOT NULL,
    "action_md" TEXT NOT NULL,
    "expected_md" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_steps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "test_steps_test_case_id_idx" ON "test_steps"("test_case_id");

-- CreateIndex
CREATE INDEX "test_steps_step_no_idx" ON "test_steps"("step_no");

-- CreateIndex
CREATE UNIQUE INDEX "test_steps_test_case_id_step_no_key" ON "test_steps"("test_case_id", "step_no");

-- AddForeignKey
ALTER TABLE "test_steps" ADD CONSTRAINT "test_steps_test_case_id_fkey" FOREIGN KEY ("test_case_id") REFERENCES "test_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
