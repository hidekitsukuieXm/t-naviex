-- CreateTable
CREATE TABLE "bug_comments" (
    "id" BIGSERIAL NOT NULL,
    "bug_id" BIGINT NOT NULL,
    "author_id" BIGINT NOT NULL,
    "parent_id" BIGINT,
    "content" TEXT NOT NULL,
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bug_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bug_attachments" (
    "id" BIGSERIAL NOT NULL,
    "bug_id" BIGINT NOT NULL,
    "uploaded_by_id" BIGINT NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "storage_path" VARCHAR(500) NOT NULL,
    "thumbnail_path" VARCHAR(500),
    "description" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bug_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bug_histories" (
    "id" BIGSERIAL NOT NULL,
    "bug_id" BIGINT NOT NULL,
    "changed_by_id" BIGINT NOT NULL,
    "field_name" VARCHAR(50) NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bug_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bug_comments_bug_id_idx" ON "bug_comments"("bug_id");

-- CreateIndex
CREATE INDEX "bug_comments_author_id_idx" ON "bug_comments"("author_id");

-- CreateIndex
CREATE INDEX "bug_comments_parent_id_idx" ON "bug_comments"("parent_id");

-- CreateIndex
CREATE INDEX "bug_comments_created_at_idx" ON "bug_comments"("created_at");

-- CreateIndex
CREATE INDEX "bug_attachments_bug_id_idx" ON "bug_attachments"("bug_id");

-- CreateIndex
CREATE INDEX "bug_attachments_uploaded_by_id_idx" ON "bug_attachments"("uploaded_by_id");

-- CreateIndex
CREATE INDEX "bug_attachments_created_at_idx" ON "bug_attachments"("created_at");

-- CreateIndex
CREATE INDEX "bug_histories_bug_id_idx" ON "bug_histories"("bug_id");

-- CreateIndex
CREATE INDEX "bug_histories_changed_by_id_idx" ON "bug_histories"("changed_by_id");

-- CreateIndex
CREATE INDEX "bug_histories_changed_at_idx" ON "bug_histories"("changed_at");

-- AddForeignKey
ALTER TABLE "bug_comments" ADD CONSTRAINT "bug_comments_bug_id_fkey" FOREIGN KEY ("bug_id") REFERENCES "bugs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bug_comments" ADD CONSTRAINT "bug_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bug_comments" ADD CONSTRAINT "bug_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "bug_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bug_attachments" ADD CONSTRAINT "bug_attachments_bug_id_fkey" FOREIGN KEY ("bug_id") REFERENCES "bugs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bug_attachments" ADD CONSTRAINT "bug_attachments_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bug_histories" ADD CONSTRAINT "bug_histories_bug_id_fkey" FOREIGN KEY ("bug_id") REFERENCES "bugs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bug_histories" ADD CONSTRAINT "bug_histories_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
