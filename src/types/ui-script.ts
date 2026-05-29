// UIスクリプトの型定義

// トリガーイベント
export type UiScriptTrigger =
  | 'PAGE_LOAD'
  | 'FORM_SUBMIT'
  | 'BUTTON_CLICK'
  | 'MODAL_OPEN'
  | 'MODAL_CLOSE'
  | 'CUSTOM';

// トリガーイベントラベル
export const UI_SCRIPT_TRIGGER_LABELS: Record<UiScriptTrigger, string> = {
  PAGE_LOAD: 'ページ読み込み時',
  FORM_SUBMIT: 'フォーム送信時',
  BUTTON_CLICK: 'ボタンクリック時',
  MODAL_OPEN: 'モーダルオープン時',
  MODAL_CLOSE: 'モーダルクローズ時',
  CUSTOM: 'カスタムイベント',
};

// UIスクリプト基本情報
export interface UiScript {
  id: string;
  name: string;
  description: string | null;
  trigger: UiScriptTrigger;
  targetPage: string | null;
  script: string | null;
  css: string | null;
  isActive: boolean;
  priority: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

// UIスクリプト作成用データ
export interface CreateUiScriptData {
  name: string;
  description?: string | null;
  trigger?: UiScriptTrigger;
  targetPage?: string | null;
  script?: string | null;
  css?: string | null;
  isActive?: boolean;
  priority?: number;
  metadata?: Record<string, unknown> | null;
}

// UIスクリプト更新用データ
export interface UpdateUiScriptData {
  name?: string;
  description?: string | null;
  trigger?: UiScriptTrigger;
  targetPage?: string | null;
  script?: string | null;
  css?: string | null;
  isActive?: boolean;
  priority?: number;
  metadata?: Record<string, unknown> | null;
}

// UIスクリプト一覧レスポンス
export interface UiScriptListResponse {
  scripts: UiScript[];
  total: number;
}

// バリデーション
export function validateUiScript(
  data: CreateUiScriptData | UpdateUiScriptData,
  isCreate: boolean = true
): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 作成時はnameが必須
  if (isCreate && (!('name' in data) || !data.name || data.name.trim().length === 0)) {
    errors.push('スクリプト名は必須です。');
  } else if ('name' in data && data.name !== undefined) {
    if (!data.name || data.name.trim().length === 0) {
      errors.push('スクリプト名は必須です。');
    } else if (data.name.length > 255) {
      errors.push('スクリプト名は255文字以内で入力してください。');
    }
  }

  if (data.targetPage !== undefined && data.targetPage !== null && data.targetPage.length > 255) {
    errors.push('対象ページパスは255文字以内で入力してください。');
  }

  if (data.script !== undefined && data.script !== null && data.script.length > 100000) {
    errors.push('スクリプトは100000文字以内で入力してください。');
  }

  if (data.css !== undefined && data.css !== null && data.css.length > 100000) {
    errors.push('CSSは100000文字以内で入力してください。');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
