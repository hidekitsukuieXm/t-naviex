-- CreateTable
CREATE TABLE "test_sections" (
    "id" BIGSERIAL NOT NULL,
    "test_spec_id" BIGINT NOT NULL,
    "parent_id" BIGINT,
    "name" VARCHAR(255) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_sections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "test_sections_test_spec_id_idx" ON "test_sections"("test_spec_id");

-- CreateIndex
CREATE INDEX "test_sections_parent_id_idx" ON "test_sections"("parent_id");

-- CreateIndex
CREATE INDEX "test_sections_sort_order_idx" ON "test_sections"("sort_order");

-- AddForeignKey
ALTER TABLE "test_sections" ADD CONSTRAINT "test_sections_test_spec_id_fkey" FOREIGN KEY ("test_spec_id") REFERENCES "test_specs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_sections" ADD CONSTRAINT "test_sections_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "test_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
