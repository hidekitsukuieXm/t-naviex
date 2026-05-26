import { prisma } from '@/lib/prisma';
import { PromptTemplateType as PrismaPromptTemplateType } from '@/generated/prisma';
import {
  PromptTemplate,
  PromptTemplateCreate,
  PromptTemplateUpdate,
  PromptTemplateType,
  PromptTemplateVariable,
} from '@/types/prompt-template';

export class PromptTemplateRepository {
  /**
   * プロジェクトのテンプレート一覧を取得
   */
  async findByProject(
    projectId: bigint | null,
    type?: PromptTemplateType
  ): Promise<PromptTemplate[]> {
    const templates = await prisma.promptTemplate.findMany({
      where: {
        OR: [{ projectId }, { isSystem: true }],
        ...(type && { type: type as PrismaPromptTemplateType }),
      },
      orderBy: [{ isSystem: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });

    return templates.map((t) => this.toPromptTemplate(t));
  }

  /**
   * IDでテンプレートを取得
   */
  async findById(id: bigint): Promise<PromptTemplate | null> {
    const template = await prisma.promptTemplate.findUnique({
      where: { id },
    });

    return template ? this.toPromptTemplate(template) : null;
  }

  /**
   * デフォルトテンプレートを取得
   */
  async findDefault(
    projectId: bigint | null,
    type: PromptTemplateType
  ): Promise<PromptTemplate | null> {
    // First try project-specific default
    let template = await prisma.promptTemplate.findFirst({
      where: {
        projectId,
        type: type as PrismaPromptTemplateType,
        isDefault: true,
      },
    });

    // Fall back to system default
    if (!template) {
      template = await prisma.promptTemplate.findFirst({
        where: {
          isSystem: true,
          type: type as PrismaPromptTemplateType,
          isDefault: true,
        },
      });
    }

    return template ? this.toPromptTemplate(template) : null;
  }

  /**
   * テンプレートを作成
   */
  async create(projectId: bigint | null, data: PromptTemplateCreate): Promise<PromptTemplate> {
    // If setting as default, unset other defaults for this type
    if (data.isDefault) {
      await prisma.promptTemplate.updateMany({
        where: {
          projectId,
          type: data.type as PrismaPromptTemplateType,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    const template = await prisma.promptTemplate.create({
      data: {
        projectId,
        name: data.name,
        description: data.description,
        type: data.type as PrismaPromptTemplateType,
        content: data.content,
        variables: data.variables as object,
        isDefault: data.isDefault ?? false,
        isSystem: false,
      },
    });

    return this.toPromptTemplate(template);
  }

  /**
   * テンプレートを更新
   */
  async update(id: bigint, data: PromptTemplateUpdate): Promise<PromptTemplate> {
    const existing = await prisma.promptTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('Template not found');
    }

    // Cannot modify system templates
    if (existing.isSystem) {
      throw new Error('System templates cannot be modified');
    }

    // If setting as default, unset other defaults for this type
    if (data.isDefault) {
      await prisma.promptTemplate.updateMany({
        where: {
          projectId: existing.projectId,
          type: existing.type,
          isDefault: true,
          NOT: { id },
        },
        data: { isDefault: false },
      });
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.variables !== undefined) updateData.variables = data.variables as object;
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;

    const template = await prisma.promptTemplate.update({
      where: { id },
      data: updateData,
    });

    return this.toPromptTemplate(template);
  }

  /**
   * テンプレートを削除
   */
  async delete(id: bigint): Promise<void> {
    const existing = await prisma.promptTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('Template not found');
    }

    // Cannot delete system templates
    if (existing.isSystem) {
      throw new Error('System templates cannot be deleted');
    }

    await prisma.promptTemplate.delete({
      where: { id },
    });
  }

  /**
   * システムテンプレートを初期化
   */
  async initializeSystemTemplates(): Promise<void> {
    const existingCount = await prisma.promptTemplate.count({
      where: { isSystem: true },
    });

    if (existingCount > 0) {
      return; // Already initialized
    }

    const systemTemplates = this.getSystemTemplates();

    await prisma.promptTemplate.createMany({
      data: systemTemplates.map((t, index) => ({
        ...t,
        isSystem: true,
        isDefault: true,
        sortOrder: index,
        variables: t.variables as object,
      })),
    });
  }

  private getSystemTemplates(): Array<{
    name: string;
    description: string;
    type: PrismaPromptTemplateType;
    content: string;
    variables: PromptTemplateVariable[];
  }> {
    return [
      {
        name: 'テストケース生成（標準）',
        description: '要件からテストケースを自動生成するための標準テンプレート',
        type: 'TEST_CASE_GENERATION' as PrismaPromptTemplateType,
        content: `以下の要件に基づいてテストケースを生成してください。

## 要件
{{requirement}}

## 対象機能
{{feature}}

## 追加の考慮事項
{{considerations}}

## 出力形式
各テストケースは以下の形式で出力してください：
- タイトル: テストケースの概要
- 事前条件: テスト実行前に必要な条件
- テスト手順: 具体的な操作手順（番号付きリスト）
- 期待結果: 各手順の期待される結果
- 優先度: 高/中/低
- テストタイプ: 機能テスト/非機能テスト/回帰テストなど`,
        variables: [
          { name: 'requirement', description: '要件の説明', required: true },
          { name: 'feature', description: '対象機能の説明', required: true },
          {
            name: 'considerations',
            description: '追加の考慮事項',
            required: false,
            defaultValue: 'なし',
          },
        ],
      },
      {
        name: 'テストケースレビュー（標準）',
        description: 'テストケースの品質をレビューするための標準テンプレート',
        type: 'TEST_CASE_REVIEW' as PrismaPromptTemplateType,
        content: `以下のテストケースをレビューしてください。

## テストケース
{{testCase}}

## レビュー観点
1. テストケースの網羅性
2. テスト手順の明確さ
3. 期待結果の具体性
4. 再現性の確認
5. 境界値のカバー
6. 異常系のカバー

## 出力形式
以下の形式でレビュー結果を出力してください：
- 評価: 合格/要修正/不合格
- 良い点: （箇条書き）
- 改善点: （箇条書き）
- 具体的な修正提案: （もしあれば）`,
        variables: [
          { name: 'testCase', description: 'レビュー対象のテストケース', required: true },
        ],
      },
      {
        name: 'テスト技法提案（標準）',
        description: '適切なテスト技法を提案するための標準テンプレート',
        type: 'TEST_TECHNIQUE' as PrismaPromptTemplateType,
        content: `以下の機能に対して適切なテスト技法を提案してください。

## 機能概要
{{feature}}

## 入力パラメータ
{{parameters}}

## 制約条件
{{constraints}}

## 出力形式
以下の形式で提案してください：
- 推奨テスト技法: （技法名と理由）
- 適用方法: （具体的な適用手順）
- 期待されるカバレッジ: （カバーできる範囲）
- 注意点: （適用時の注意事項）`,
        variables: [
          { name: 'feature', description: '機能の概要', required: true },
          { name: 'parameters', description: '入力パラメータの一覧', required: true },
          {
            name: 'constraints',
            description: '制約条件',
            required: false,
            defaultValue: '特になし',
          },
        ],
      },
      {
        name: '工数予測（標準）',
        description: 'テスト工数を予測するための標準テンプレート',
        type: 'EFFORT_ESTIMATION' as PrismaPromptTemplateType,
        content: `以下の情報に基づいてテスト工数を予測してください。

## プロジェクト概要
{{projectOverview}}

## テスト範囲
{{testScope}}

## テストケース数
{{testCaseCount}}

## チーム情報
{{teamInfo}}

## 出力形式
以下の形式で予測結果を出力してください：
- 総工数: （人日）
- 内訳:
  - テスト設計: X人日
  - テスト実行: X人日
  - バグ修正確認: X人日
- リスク要因: （工数に影響を与える可能性のある要因）
- 推奨バッファ: X%`,
        variables: [
          { name: 'projectOverview', description: 'プロジェクトの概要', required: true },
          { name: 'testScope', description: 'テスト範囲の説明', required: true },
          { name: 'testCaseCount', description: 'テストケース数', required: true },
          {
            name: 'teamInfo',
            description: 'チーム構成と経験',
            required: false,
            defaultValue: '標準的なチーム',
          },
        ],
      },
      {
        name: 'バグ分析（標準）',
        description: 'バグの原因分析を行うための標準テンプレート',
        type: 'BUG_ANALYSIS' as PrismaPromptTemplateType,
        content: `以下のバグ情報を分析してください。

## バグ概要
{{bugSummary}}

## 再現手順
{{reproductionSteps}}

## 発生環境
{{environment}}

## 関連情報
{{additionalInfo}}

## 出力形式
以下の形式で分析結果を出力してください：
- 推定原因: （根本原因の推定）
- 影響範囲: （他の機能への影響）
- 修正方針: （推奨される修正アプローチ）
- 予防策: （再発防止のための提案）
- 関連テストケース: （追加すべきテストケース）`,
        variables: [
          { name: 'bugSummary', description: 'バグの概要', required: true },
          { name: 'reproductionSteps', description: '再現手順', required: true },
          { name: 'environment', description: '発生環境', required: true },
          {
            name: 'additionalInfo',
            description: '追加情報',
            required: false,
            defaultValue: 'なし',
          },
        ],
      },
    ];
  }

  private toPromptTemplate(template: {
    id: bigint;
    projectId: bigint | null;
    name: string;
    description: string | null;
    type: PrismaPromptTemplateType;
    content: string;
    variables: unknown;
    isSystem: boolean;
    isDefault: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  }): PromptTemplate {
    return {
      id: template.id,
      projectId: template.projectId,
      name: template.name,
      description: template.description,
      type: template.type as PromptTemplateType,
      content: template.content,
      variables: (template.variables as PromptTemplateVariable[]) || [],
      isSystem: template.isSystem,
      isDefault: template.isDefault,
      sortOrder: template.sortOrder,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }
}

export const promptTemplateRepository = new PromptTemplateRepository();
