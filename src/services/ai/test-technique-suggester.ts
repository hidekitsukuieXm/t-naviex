import { ClaudeClient } from '@/lib/claude';
import { aiSettingsRepository } from '@/repositories/ai-settings-repository';
import { promptTemplateRepository } from '@/repositories/prompt-template-repository';
import { substituteVariables } from '@/types/prompt-template';

export type TestTechnique =
  | 'EQUIVALENCE_PARTITIONING'
  | 'BOUNDARY_VALUE'
  | 'DECISION_TABLE'
  | 'STATE_TRANSITION'
  | 'PAIRWISE'
  | 'EXPLORATORY'
  | 'USE_CASE'
  | 'ERROR_GUESSING';

export interface TechniqueSuggestion {
  technique: TestTechnique;
  name: string;
  applicability: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
  example?: string;
  guidelines: string[];
}

export interface TechniqueGuide {
  technique: TestTechnique;
  name: string;
  description: string;
  whenToUse: string[];
  howToApply: string[];
  examples: string[];
}

export interface TestTechniqueSuggestionResult {
  suggestions: TechniqueSuggestion[];
  overallRecommendation: string;
  testDesignGuidance: string;
}

export interface TestTechniqueSuggestionOptions {
  requirement: string;
  feature?: string;
  inputTypes?: string;
  constraints?: string;
}

export interface TestTechniqueSuggestionResponse {
  result: TestTechniqueSuggestionResult;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export const TECHNIQUE_INFO: Record<TestTechnique, { name: string; description: string }> = {
  EQUIVALENCE_PARTITIONING: {
    name: '同値分割',
    description:
      '入力データを有効な値と無効な値のグループに分割し、各グループから代表値を選んでテストする技法',
  },
  BOUNDARY_VALUE: {
    name: '境界値分析',
    description: '入力範囲の境界付近の値に焦点を当ててテストする技法',
  },
  DECISION_TABLE: {
    name: 'デシジョンテーブル',
    description: '複数の条件とそれに対応するアクションの組み合わせを表形式で整理してテストする技法',
  },
  STATE_TRANSITION: {
    name: '状態遷移',
    description: 'システムの状態と状態間の遷移をモデル化してテストする技法',
  },
  PAIRWISE: {
    name: 'ペアワイズ',
    description: 'すべてのパラメータの2値の組み合わせをカバーするテストケースを生成する技法',
  },
  EXPLORATORY: {
    name: '探索的テスト',
    description: 'テスト設計と実行を同時に行い、システムを探索しながらテストする技法',
  },
  USE_CASE: {
    name: 'ユースケーステスト',
    description: 'ユーザーの操作シナリオに基づいてテストを行う技法',
  },
  ERROR_GUESSING: {
    name: 'エラー推測',
    description: 'テスターの経験と直感に基づいてエラーが発生しそうな箇所を推測してテストする技法',
  },
};

export class TestTechniqueSuggesterService {
  /**
   * テスト技法を提案
   */
  async suggestTechniques(
    projectId: bigint | null,
    options: TestTechniqueSuggestionOptions
  ): Promise<TestTechniqueSuggestionResponse> {
    // Get API key
    const apiKey = await aiSettingsRepository.getDecryptedApiKey(projectId);
    if (!apiKey) {
      throw new Error('APIキーが設定されていません');
    }

    // Get settings
    const settings = await aiSettingsRepository.getOrCreateSettings(projectId);
    if (!settings.isEnabled) {
      throw new Error('AI機能が無効になっています');
    }

    // Get template
    const template = await promptTemplateRepository.findDefault(projectId, 'TEST_TECHNIQUE');
    if (!template) {
      throw new Error('テスト技法提案テンプレートが見つかりません');
    }

    // Build prompt
    const prompt = this.buildPrompt(template.content, options);

    // Create Claude client
    const client = new ClaudeClient({
      apiKey,
      timeout: 120000,
      maxRetries: 2,
    });

    // Generate
    const response = await client.sendMessage({
      messages: [{ role: 'user', content: prompt }],
      model: settings.model,
      maxTokens: settings.maxTokens,
      temperature: settings.temperature,
      systemPrompt: this.getSystemPrompt(),
    });

    // Record usage
    await aiSettingsRepository.recordUsage(projectId, response.usage.totalTokens);

    // Parse response
    const result = this.parseResponse(response.content);

    return {
      result,
      usage: {
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
      },
    };
  }

  /**
   * 特定の技法のガイドを取得
   */
  getTechniqueGuide(technique: TestTechnique): TechniqueGuide {
    const guides: Record<TestTechnique, TechniqueGuide> = {
      EQUIVALENCE_PARTITIONING: {
        technique: 'EQUIVALENCE_PARTITIONING',
        name: '同値分割',
        description:
          '入力データを同じ振る舞いをするグループに分割し、各グループから1つの代表値をテストする技法です。',
        whenToUse: [
          '入力に明確な有効/無効の範囲がある場合',
          '多数の入力値から効率的にテストケースを選びたい場合',
          '同じ処理結果になる入力グループを特定できる場合',
        ],
        howToApply: [
          '1. 入力パラメータを特定する',
          '2. 各パラメータの有効同値クラスと無効同値クラスを特定する',
          '3. 各同値クラスから代表値を選択する',
          '4. 代表値を使用してテストケースを作成する',
        ],
        examples: [
          '年齢入力（1-120）: 有効クラス[1-120]、無効クラス[<1, >120]',
          'パスワード（8-20文字）: 有効クラス[8-20文字]、無効クラス[<8文字, >20文字]',
        ],
      },
      BOUNDARY_VALUE: {
        technique: 'BOUNDARY_VALUE',
        name: '境界値分析',
        description:
          '入力範囲の境界値付近でエラーが発生しやすいことを利用し、境界値とその前後をテストする技法です。',
        whenToUse: [
          '数値や日付など連続した値の入力がある場合',
          '範囲制限のある入力フィールドがある場合',
          '配列やリストの処理をテストする場合',
        ],
        howToApply: [
          '1. 入力の最小値、最大値を特定する',
          '2. 境界値（最小、最大）をテストする',
          '3. 境界の直前の値（最小-1、最大+1）をテストする',
          '4. 境界の直後の値（最小+1、最大-1）もテストする',
        ],
        examples: [
          '年齢（1-120）: テスト値 = 0, 1, 2, 119, 120, 121',
          '商品数量（1-99）: テスト値 = 0, 1, 2, 98, 99, 100',
        ],
      },
      DECISION_TABLE: {
        technique: 'DECISION_TABLE',
        name: 'デシジョンテーブル',
        description:
          '複数の条件と結果の組み合わせを表形式で整理し、すべての組み合わせを網羅的にテストする技法です。',
        whenToUse: [
          '複数の条件が組み合わさって結果が決まる場合',
          'ビジネスルールが複雑な場合',
          '条件の組み合わせを漏れなくテストしたい場合',
        ],
        howToApply: [
          '1. すべての条件を列挙する',
          '2. すべてのアクション（結果）を列挙する',
          '3. 条件の組み合わせを表にまとめる',
          '4. 各組み合わせに対するアクションを決定する',
          '5. 各ルール（列）をテストケースとして実行する',
        ],
        examples: [
          'ログイン: 条件[ID存在, パスワード一致, アカウント有効] → 結果[ログイン成功/失敗]',
          '割引適用: 条件[会員種別, 購入金額, クーポン有無] → 結果[割引率]',
        ],
      },
      STATE_TRANSITION: {
        technique: 'STATE_TRANSITION',
        name: '状態遷移',
        description:
          'システムの状態とイベントによる状態遷移をモデル化し、遷移パスをテストする技法です。',
        whenToUse: [
          'システムに明確な状態がある場合（例: ログイン状態、注文状態）',
          '状態によって異なる動作をする場合',
          'ワークフローやプロセスをテストする場合',
        ],
        howToApply: [
          '1. システムの状態を特定する',
          '2. 状態遷移図を作成する',
          '3. 有効な遷移と無効な遷移を特定する',
          '4. 状態遷移表を作成する',
          '5. 各遷移をテストケースとして実行する',
        ],
        examples: [
          '注文: [作成中] → [確認待ち] → [承認済み] → [発送済み] → [完了]',
          'ユーザー: [未登録] → [仮登録] → [本登録] → [退会]',
        ],
      },
      PAIRWISE: {
        technique: 'PAIRWISE',
        name: 'ペアワイズ',
        description:
          'すべてのパラメータの2つの値の組み合わせをカバーする最小のテストケースセットを生成する技法です。',
        whenToUse: [
          'パラメータが多く全組み合わせテストが現実的でない場合',
          '設定オプションの組み合わせをテストする場合',
          '効率的に高いカバレッジを達成したい場合',
        ],
        howToApply: [
          '1. テスト対象のパラメータを特定する',
          '2. 各パラメータの値を列挙する',
          '3. ペアワイズテスト生成ツールを使用してテストケースを生成する',
          '4. 生成されたテストケースを実行する',
        ],
        examples: [
          'ブラウザ[Chrome, Firefox, Safari] × OS[Windows, Mac, Linux] × 言語[日本語, 英語]',
          '解像度[HD, FHD, 4K] × 接続[WiFi, 有線, モバイル] × モード[ライト, ダーク]',
        ],
      },
      EXPLORATORY: {
        technique: 'EXPLORATORY',
        name: '探索的テスト',
        description:
          'テスト設計、実行、学習を同時に行い、テスターの知識と直感を活用してシステムを探索的にテストする技法です。',
        whenToUse: [
          '仕様が不完全または不明確な場合',
          '迅速にシステムの問題を発見したい場合',
          '想定外のシナリオをテストしたい場合',
        ],
        howToApply: [
          '1. テストチャーターを作成する（目的、範囲、時間を定義）',
          '2. タイムボックス（例: 60分）を設定する',
          '3. システムを操作しながらテストと学習を行う',
          '4. 発見した問題と洞察を記録する',
          '5. セッションを振り返り、次のチャーターを計画する',
        ],
        examples: [
          'チャーター: 新規ユーザー登録フローで起こりうる問題を60分で探索する',
          'チャーター: 検索機能の限界とエッジケースを45分で調査する',
        ],
      },
      USE_CASE: {
        technique: 'USE_CASE',
        name: 'ユースケーステスト',
        description:
          'ユーザーの実際の利用シナリオに基づいてテストケースを作成し、エンドツーエンドでテストする技法です。',
        whenToUse: [
          'ユーザーストーリーやユースケースが定義されている場合',
          'ビジネスプロセス全体をテストしたい場合',
          'ユーザー視点での品質を確認したい場合',
        ],
        howToApply: [
          '1. ユースケース図または仕様からシナリオを特定する',
          '2. 正常系シナリオをテストケースとして作成する',
          '3. 代替フローや例外フローも追加する',
          '4. 事前条件と事後条件を明確にする',
          '5. シナリオに沿ってエンドツーエンドでテストを実行する',
        ],
        examples: [
          '商品購入シナリオ: ログイン → 商品検索 → カート追加 → 決済 → 確認メール',
          '問い合わせシナリオ: フォーム入力 → 確認 → 送信 → 自動返信 → 対応',
        ],
      },
      ERROR_GUESSING: {
        technique: 'ERROR_GUESSING',
        name: 'エラー推測',
        description:
          'テスターの経験と直感に基づいて、エラーが発生しやすい箇所を推測してテストする技法です。',
        whenToUse: [
          '過去に問題が発生した箇所をテストする場合',
          '一般的なエラーパターンを確認したい場合',
          '他の技法で見逃しやすいケースを補完したい場合',
        ],
        howToApply: [
          '1. 過去の不具合履歴を参照する',
          '2. 一般的なエラーパターンのリストを準備する',
          '3. 複雑な処理や変更が多い箇所を特定する',
          '4. 推測に基づいてテストケースを作成する',
          '5. 発見した問題をエラー推測リストに追加する',
        ],
        examples: [
          'Null/空文字入力、特殊文字（<>&"\'）、SQLインジェクション文字列',
          'ゼロ除算、桁あふれ、同時実行、タイムアウト',
        ],
      },
    };

    return guides[technique];
  }

  private buildPrompt(templateContent: string, options: TestTechniqueSuggestionOptions): string {
    let prompt = substituteVariables(templateContent, {
      requirement: options.requirement,
      feature: options.feature || '指定なし',
      inputTypes: options.inputTypes || '指定なし',
      constraints: options.constraints || 'なし',
    });

    prompt += `\n\n## 対応可能なテスト技法
- EQUIVALENCE_PARTITIONING: 同値分割
- BOUNDARY_VALUE: 境界値分析
- DECISION_TABLE: デシジョンテーブル
- STATE_TRANSITION: 状態遷移
- PAIRWISE: ペアワイズ
- EXPLORATORY: 探索的テスト
- USE_CASE: ユースケーステスト
- ERROR_GUESSING: エラー推測

## 出力形式（JSON）
以下のJSON形式で出力してください。マークダウンのコードブロックは使用せず、純粋なJSONのみを出力してください:

{
  "suggestions": [
    {
      "technique": "EQUIVALENCE_PARTITIONING",
      "name": "同値分割",
      "applicability": "HIGH|MEDIUM|LOW",
      "reason": "この技法を推奨する理由",
      "example": "具体的な適用例",
      "guidelines": ["適用時のガイドライン1", "ガイドライン2"]
    }
  ],
  "overallRecommendation": "全体的な推奨コメント",
  "testDesignGuidance": "テスト設計全般に関するガイダンス"
}`;

    return prompt;
  }

  private getSystemPrompt(): string {
    return `あなたは経験豊富なソフトウェアテストエンジニアです。
テスト対象の特性に応じて最適なテスト技法を提案してください。
以下の観点で分析を行います：

1. 入力データの特性
   - 範囲や境界がある値 → 境界値分析、同値分割
   - 複数条件の組み合わせ → デシジョンテーブル、ペアワイズ

2. システムの特性
   - 状態を持つシステム → 状態遷移テスト
   - ユーザーワークフロー → ユースケーステスト

3. テスト目的
   - 網羅的なテスト → 組み合わせ技法
   - 探索的な品質確認 → 探索的テスト

4. 制約条件
   - 時間やリソースの制約に応じた効率的な技法を推奨

提案は具体的で実践的なものにしてください。
出力は必ずJSON形式で、余計な説明文は含めないでください。`;
  }

  private parseResponse(content: string): TestTechniqueSuggestionResult {
    try {
      // Remove markdown code blocks if present
      let jsonContent = content.trim();
      if (jsonContent.startsWith('```json')) {
        jsonContent = jsonContent.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }

      const parsed = JSON.parse(jsonContent);

      return {
        suggestions: Array.isArray(parsed.suggestions)
          ? parsed.suggestions.map((s: Record<string, unknown>) => ({
              technique: this.normalizeTechnique(String(s.technique || '')),
              name: String(s.name || ''),
              applicability: this.normalizeApplicability(String(s.applicability || '')),
              reason: String(s.reason || ''),
              example: s.example ? String(s.example) : undefined,
              guidelines: Array.isArray(s.guidelines) ? s.guidelines.map((g) => String(g)) : [],
            }))
          : [],
        overallRecommendation: String(parsed.overallRecommendation || ''),
        testDesignGuidance: String(parsed.testDesignGuidance || ''),
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw new Error('AIの応答を解析できませんでした。再度お試しください。');
    }
  }

  private normalizeTechnique(technique: string): TestTechnique {
    const upper = technique.toUpperCase().replace(/-/g, '_');
    const validTechniques: TestTechnique[] = [
      'EQUIVALENCE_PARTITIONING',
      'BOUNDARY_VALUE',
      'DECISION_TABLE',
      'STATE_TRANSITION',
      'PAIRWISE',
      'EXPLORATORY',
      'USE_CASE',
      'ERROR_GUESSING',
    ];

    if (validTechniques.includes(upper as TestTechnique)) {
      return upper as TestTechnique;
    }

    // Try to match by Japanese name
    const lower = technique.toLowerCase();
    if (lower.includes('同値')) return 'EQUIVALENCE_PARTITIONING';
    if (lower.includes('境界')) return 'BOUNDARY_VALUE';
    if (lower.includes('デシジョン') || lower.includes('決定表')) return 'DECISION_TABLE';
    if (lower.includes('状態')) return 'STATE_TRANSITION';
    if (lower.includes('ペア')) return 'PAIRWISE';
    if (lower.includes('探索')) return 'EXPLORATORY';
    if (lower.includes('ユースケース')) return 'USE_CASE';
    if (lower.includes('エラー') || lower.includes('推測')) return 'ERROR_GUESSING';

    return 'EQUIVALENCE_PARTITIONING'; // Default
  }

  private normalizeApplicability(applicability: string): 'HIGH' | 'MEDIUM' | 'LOW' {
    const upper = applicability.toUpperCase();
    if (upper === 'HIGH' || upper === '高') return 'HIGH';
    if (upper === 'LOW' || upper === '低') return 'LOW';
    return 'MEDIUM';
  }
}

export const testTechniqueSuggesterService = new TestTechniqueSuggesterService();
