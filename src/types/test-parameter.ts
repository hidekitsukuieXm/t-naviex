// テストパラメーターの型定義

// テストパラメーター基本情報
export interface TestParameter {
  id: string;
  testCaseId: string;
  name: string;
  description: string | null;
  values: string[];
  isRequired: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// テストパラメーター作成用データ
export interface CreateTestParameterData {
  name: string;
  description?: string | null;
  values?: string[];
  isRequired?: boolean;
  sortOrder?: number;
}

// テストパラメーター更新用データ
export interface UpdateTestParameterData {
  name?: string;
  description?: string | null;
  values?: string[];
  isRequired?: boolean;
  sortOrder?: number;
}

// テストパラメーター一覧レスポンス
export interface TestParameterListResponse {
  parameters: TestParameter[];
  total: number;
}

// パラメーター展開結果（テストケースインスタンス）
export interface ParameterCombination {
  index: number;
  values: Record<string, string>; // パラメーター名 -> 値
}

// パラメーター展開
export function expandParameters(parameters: TestParameter[]): ParameterCombination[] {
  if (parameters.length === 0) {
    return [];
  }

  // 各パラメーターの値の組み合わせを生成
  const result: ParameterCombination[] = [];

  function generateCombinations(paramIndex: number, currentValues: Record<string, string>): void {
    if (paramIndex >= parameters.length) {
      result.push({
        index: result.length,
        values: { ...currentValues },
      });
      return;
    }

    const param = parameters[paramIndex];
    const values = param.values.length > 0 ? param.values : [''];

    for (const value of values) {
      currentValues[param.name] = value;
      generateCombinations(paramIndex + 1, currentValues);
    }
  }

  generateCombinations(0, {});

  return result;
}

// パラメーター数からの組み合わせ数計算
export function calculateCombinationCount(parameters: TestParameter[]): number {
  if (parameters.length === 0) {
    return 0;
  }

  return parameters.reduce((count, param) => {
    const valueCount = param.values.length > 0 ? param.values.length : 1;
    return count * valueCount;
  }, 1);
}

// バリデーション
export function validateTestParameter(data: CreateTestParameterData | UpdateTestParameterData): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if ('name' in data && data.name !== undefined) {
    if (!data.name || data.name.trim().length === 0) {
      errors.push('パラメーター名は必須です。');
    } else if (data.name.length > 255) {
      errors.push('パラメーター名は255文字以内で入力してください。');
    }
  }

  if (data.values !== undefined) {
    if (data.values.length > 100) {
      errors.push('パラメーター値は100個以内で設定してください。');
    }

    for (const value of data.values) {
      if (value.length > 1000) {
        errors.push('各パラメーター値は1000文字以内で入力してください。');
        break;
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
