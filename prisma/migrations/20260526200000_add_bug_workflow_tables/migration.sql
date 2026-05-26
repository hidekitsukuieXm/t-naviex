-- CreateTable
CREATE TABLE "bug_workflows" (
    "id" BIGSERIAL NOT NULL,
    "project_id" BIGINT,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bug_workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bug_workflow_transitions" (
    "id" BIGSERIAL NOT NULL,
    "workflow_id" BIGINT NOT NULL,
    "from_status" VARCHAR(50) NOT NULL,
    "to_status" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100),
    "description" VARCHAR(500),
    "button_label" VARCHAR(50),
    "button_color" VARCHAR(50),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "required_role" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bug_workflow_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bug_workflows_project_id_idx" ON "bug_workflows"("project_id");

-- CreateIndex
CREATE INDEX "bug_workflows_is_enabled_idx" ON "bug_workflows"("is_enabled");

-- CreateIndex
CREATE INDEX "bug_workflow_transitions_workflow_id_idx" ON "bug_workflow_transitions"("workflow_id");

-- CreateIndex
CREATE INDEX "bug_workflow_transitions_from_status_idx" ON "bug_workflow_transitions"("from_status");

-- CreateIndex
CREATE INDEX "bug_workflow_transitions_to_status_idx" ON "bug_workflow_transitions"("to_status");

-- CreateIndex
CREATE UNIQUE INDEX "bug_workflow_transitions_workflow_id_from_status_to_status_key" ON "bug_workflow_transitions"("workflow_id", "from_status", "to_status");

-- AddForeignKey
ALTER TABLE "bug_workflows" ADD CONSTRAINT "bug_workflows_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bug_workflow_transitions" ADD CONSTRAINT "bug_workflow_transitions_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "bug_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert default workflow (system-wide)
INSERT INTO "bug_workflows" ("project_id", "name", "description", "is_default", "is_enabled", "updated_at")
VALUES (NULL, 'デフォルトワークフロー', '標準的なバグ管理ワークフロー', true, true, CURRENT_TIMESTAMP);

-- Get the workflow ID and insert transitions
DO $$
DECLARE
    workflow_id BIGINT;
BEGIN
    SELECT id INTO workflow_id FROM "bug_workflows" WHERE "name" = 'デフォルトワークフロー' AND "project_id" IS NULL;

    -- NEW transitions
    INSERT INTO "bug_workflow_transitions" ("workflow_id", "from_status", "to_status", "name", "button_label", "sort_order", "updated_at")
    VALUES
        (workflow_id, 'NEW', 'OPEN', '受付', 'オープンに変更', 1, CURRENT_TIMESTAMP),
        (workflow_id, 'NEW', 'IN_PROGRESS', '対応開始', '対応開始', 2, CURRENT_TIMESTAMP),
        (workflow_id, 'NEW', 'REJECTED', '却下', '却下', 3, CURRENT_TIMESTAMP),
        (workflow_id, 'NEW', 'DEFERRED', '保留', '保留にする', 4, CURRENT_TIMESTAMP);

    -- OPEN transitions
    INSERT INTO "bug_workflow_transitions" ("workflow_id", "from_status", "to_status", "name", "button_label", "sort_order", "updated_at")
    VALUES
        (workflow_id, 'OPEN', 'IN_PROGRESS', '対応開始', '対応開始', 1, CURRENT_TIMESTAMP),
        (workflow_id, 'OPEN', 'RESOLVED', '解決', '解決済みにする', 2, CURRENT_TIMESTAMP),
        (workflow_id, 'OPEN', 'REJECTED', '却下', '却下', 3, CURRENT_TIMESTAMP),
        (workflow_id, 'OPEN', 'DEFERRED', '保留', '保留にする', 4, CURRENT_TIMESTAMP);

    -- IN_PROGRESS transitions
    INSERT INTO "bug_workflow_transitions" ("workflow_id", "from_status", "to_status", "name", "button_label", "sort_order", "updated_at")
    VALUES
        (workflow_id, 'IN_PROGRESS', 'RESOLVED', '解決', '解決済みにする', 1, CURRENT_TIMESTAMP),
        (workflow_id, 'IN_PROGRESS', 'OPEN', '戻す', 'オープンに戻す', 2, CURRENT_TIMESTAMP),
        (workflow_id, 'IN_PROGRESS', 'DEFERRED', '保留', '保留にする', 3, CURRENT_TIMESTAMP);

    -- RESOLVED transitions
    INSERT INTO "bug_workflow_transitions" ("workflow_id", "from_status", "to_status", "name", "button_label", "sort_order", "updated_at")
    VALUES
        (workflow_id, 'RESOLVED', 'VERIFIED', '検証完了', '検証済みにする', 1, CURRENT_TIMESTAMP),
        (workflow_id, 'RESOLVED', 'OPEN', '再オープン', '再オープン', 2, CURRENT_TIMESTAMP),
        (workflow_id, 'RESOLVED', 'IN_PROGRESS', '修正再開', '対応再開', 3, CURRENT_TIMESTAMP);

    -- VERIFIED transitions
    INSERT INTO "bug_workflow_transitions" ("workflow_id", "from_status", "to_status", "name", "button_label", "sort_order", "updated_at")
    VALUES
        (workflow_id, 'VERIFIED', 'CLOSED', 'クローズ', 'クローズする', 1, CURRENT_TIMESTAMP),
        (workflow_id, 'VERIFIED', 'OPEN', '再オープン', '再オープン', 2, CURRENT_TIMESTAMP);

    -- CLOSED transitions
    INSERT INTO "bug_workflow_transitions" ("workflow_id", "from_status", "to_status", "name", "button_label", "sort_order", "updated_at")
    VALUES
        (workflow_id, 'CLOSED', 'OPEN', '再オープン', '再オープン', 1, CURRENT_TIMESTAMP);

    -- REJECTED transitions
    INSERT INTO "bug_workflow_transitions" ("workflow_id", "from_status", "to_status", "name", "button_label", "sort_order", "updated_at")
    VALUES
        (workflow_id, 'REJECTED', 'OPEN', '再オープン', '再オープン', 1, CURRENT_TIMESTAMP);

    -- DEFERRED transitions
    INSERT INTO "bug_workflow_transitions" ("workflow_id", "from_status", "to_status", "name", "button_label", "sort_order", "updated_at")
    VALUES
        (workflow_id, 'DEFERRED', 'OPEN', '再開', 'オープンに戻す', 1, CURRENT_TIMESTAMP),
        (workflow_id, 'DEFERRED', 'IN_PROGRESS', '対応開始', '対応開始', 2, CURRENT_TIMESTAMP);
END $$;
