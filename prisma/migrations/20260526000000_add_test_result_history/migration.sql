-- CreateTable: テスト結果編集履歴
CREATE TABLE "test_result_histories" (
    "id" BIGSERIAL NOT NULL,
    "test_result_id" BIGINT NOT NULL,
    "edited_by_id" BIGINT NOT NULL,
    "field_name" VARCHAR(50) NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "edited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_result_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "test_result_histories_test_result_id_idx" ON "test_result_histories"("test_result_id");

-- CreateIndex
CREATE INDEX "test_result_histories_edited_by_id_idx" ON "test_result_histories"("edited_by_id");

-- CreateIndex
CREATE INDEX "test_result_histories_edited_at_idx" ON "test_result_histories"("edited_at");

-- AddForeignKey
ALTER TABLE "test_result_histories" ADD CONSTRAINT "test_result_histories_test_result_id_fkey" FOREIGN KEY ("test_result_id") REFERENCES "test_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_result_histories" ADD CONSTRAINT "test_result_histories_edited_by_id_fkey" FOREIGN KEY ("edited_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
