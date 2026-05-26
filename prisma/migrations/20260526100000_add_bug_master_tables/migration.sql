-- CreateTable
CREATE TABLE "bug_type_masters" (
    "id" BIGSERIAL NOT NULL,
    "project_id" BIGINT,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "color" VARCHAR(50) NOT NULL,
    "icon" VARCHAR(50),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bug_type_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bug_status_masters" (
    "id" BIGSERIAL NOT NULL,
    "project_id" BIGINT,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "color" VARCHAR(50) NOT NULL,
    "icon" VARCHAR(50),
    "category" VARCHAR(20) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_final" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bug_status_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bug_priority_masters" (
    "id" BIGSERIAL NOT NULL,
    "project_id" BIGINT,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "color" VARCHAR(50) NOT NULL,
    "icon" VARCHAR(50),
    "level" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bug_priority_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bug_severity_masters" (
    "id" BIGSERIAL NOT NULL,
    "project_id" BIGINT,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "color" VARCHAR(50) NOT NULL,
    "icon" VARCHAR(50),
    "level" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bug_severity_masters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bug_type_masters_project_id_idx" ON "bug_type_masters"("project_id");

-- CreateIndex
CREATE INDEX "bug_type_masters_is_enabled_idx" ON "bug_type_masters"("is_enabled");

-- CreateIndex
CREATE INDEX "bug_type_masters_sort_order_idx" ON "bug_type_masters"("sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "bug_type_masters_project_id_code_key" ON "bug_type_masters"("project_id", "code");

-- CreateIndex
CREATE INDEX "bug_status_masters_project_id_idx" ON "bug_status_masters"("project_id");

-- CreateIndex
CREATE INDEX "bug_status_masters_is_enabled_idx" ON "bug_status_masters"("is_enabled");

-- CreateIndex
CREATE INDEX "bug_status_masters_category_idx" ON "bug_status_masters"("category");

-- CreateIndex
CREATE INDEX "bug_status_masters_sort_order_idx" ON "bug_status_masters"("sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "bug_status_masters_project_id_code_key" ON "bug_status_masters"("project_id", "code");

-- CreateIndex
CREATE INDEX "bug_priority_masters_project_id_idx" ON "bug_priority_masters"("project_id");

-- CreateIndex
CREATE INDEX "bug_priority_masters_is_enabled_idx" ON "bug_priority_masters"("is_enabled");

-- CreateIndex
CREATE INDEX "bug_priority_masters_sort_order_idx" ON "bug_priority_masters"("sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "bug_priority_masters_project_id_code_key" ON "bug_priority_masters"("project_id", "code");

-- CreateIndex
CREATE INDEX "bug_severity_masters_project_id_idx" ON "bug_severity_masters"("project_id");

-- CreateIndex
CREATE INDEX "bug_severity_masters_is_enabled_idx" ON "bug_severity_masters"("is_enabled");

-- CreateIndex
CREATE INDEX "bug_severity_masters_sort_order_idx" ON "bug_severity_masters"("sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "bug_severity_masters_project_id_code_key" ON "bug_severity_masters"("project_id", "code");

-- AddForeignKey
ALTER TABLE "bug_type_masters" ADD CONSTRAINT "bug_type_masters_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bug_status_masters" ADD CONSTRAINT "bug_status_masters_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bug_priority_masters" ADD CONSTRAINT "bug_priority_masters_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bug_severity_masters" ADD CONSTRAINT "bug_severity_masters_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert default bug types (system-wide)
INSERT INTO "bug_type_masters" ("project_id", "code", "name", "description", "color", "sort_order", "is_enabled", "is_default", "updated_at")
VALUES
    (NULL, 'BUG', '不具合', 'ソフトウェアの不具合・バグ', 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', 1, true, true, CURRENT_TIMESTAMP),
    (NULL, 'FEATURE', '機能要望', '新機能の追加要望', 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', 2, true, false, CURRENT_TIMESTAMP),
    (NULL, 'INQUIRY', '問い合わせ', 'ユーザーからの問い合わせ', 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300', 3, true, false, CURRENT_TIMESTAMP),
    (NULL, 'TASK', 'タスク', '作業タスク', 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300', 4, true, false, CURRENT_TIMESTAMP),
    (NULL, 'IMPROVEMENT', '改善', '既存機能の改善', 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', 5, true, false, CURRENT_TIMESTAMP);

-- Insert default bug statuses (system-wide)
INSERT INTO "bug_status_masters" ("project_id", "code", "name", "description", "color", "category", "sort_order", "is_enabled", "is_default", "is_final", "updated_at")
VALUES
    (NULL, 'NEW', '新規', '新しく報告された状態', 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', 'OPEN', 1, true, true, false, CURRENT_TIMESTAMP),
    (NULL, 'OPEN', 'オープン', '確認済みで対応待ち', 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300', 'OPEN', 2, true, false, false, CURRENT_TIMESTAMP),
    (NULL, 'IN_PROGRESS', '対応中', '修正作業中', 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300', 'IN_PROGRESS', 3, true, false, false, CURRENT_TIMESTAMP),
    (NULL, 'RESOLVED', '解決済み', '修正完了で検証待ち', 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', 'RESOLVED', 4, true, false, false, CURRENT_TIMESTAMP),
    (NULL, 'VERIFIED', '検証済み', '検証完了', 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300', 'RESOLVED', 5, true, false, false, CURRENT_TIMESTAMP),
    (NULL, 'CLOSED', 'クローズ', '完了', 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', 'CLOSED', 6, true, false, true, CURRENT_TIMESTAMP),
    (NULL, 'REJECTED', '却下', '対応しない', 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', 'CLOSED', 7, true, false, true, CURRENT_TIMESTAMP),
    (NULL, 'DEFERRED', '保留', '後回し', 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300', 'OPEN', 8, true, false, false, CURRENT_TIMESTAMP);

-- Insert default bug priorities (system-wide)
INSERT INTO "bug_priority_masters" ("project_id", "code", "name", "description", "color", "level", "sort_order", "is_enabled", "is_default", "updated_at")
VALUES
    (NULL, 'CRITICAL', '緊急', '即時対応が必要', 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', 4, 1, true, false, CURRENT_TIMESTAMP),
    (NULL, 'HIGH', '高', '優先的に対応', 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300', 3, 2, true, false, CURRENT_TIMESTAMP),
    (NULL, 'MEDIUM', '中', '通常の優先度', 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300', 2, 3, true, true, CURRENT_TIMESTAMP),
    (NULL, 'LOW', '低', '低優先度', 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', 1, 4, true, false, CURRENT_TIMESTAMP);

-- Insert default bug severities (system-wide)
INSERT INTO "bug_severity_masters" ("project_id", "code", "name", "description", "color", "level", "sort_order", "is_enabled", "is_default", "updated_at")
VALUES
    (NULL, 'BLOCKER', 'ブロッカー', 'システムが使用不可', 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300', 5, 1, true, false, CURRENT_TIMESTAMP),
    (NULL, 'CRITICAL', '致命的', '主要機能が使用不可', 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', 4, 2, true, false, CURRENT_TIMESTAMP),
    (NULL, 'MAJOR', '重大', '機能が制限される', 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300', 3, 3, true, true, CURRENT_TIMESTAMP),
    (NULL, 'MINOR', '軽微', '軽微な問題', 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300', 2, 4, true, false, CURRENT_TIMESTAMP),
    (NULL, 'TRIVIAL', '些細', 'UIの軽微な問題など', 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', 1, 5, true, false, CURRENT_TIMESTAMP);
