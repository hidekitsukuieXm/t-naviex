// Branding Types - Logo and Theme Color Settings

export interface BrandingSettings {
  id: string;
  organizationId: string;
  logoUrl: string | null;
  logoLightUrl: string | null; // Light mode logo
  logoDarkUrl: string | null; // Dark mode logo
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string | null;
  accentColor: string | null;
  fontFamily: string | null;
  customCss: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateBrandingData {
  logoUrl?: string | null;
  logoLightUrl?: string | null;
  logoDarkUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor?: string;
  secondaryColor?: string | null;
  accentColor?: string | null;
  fontFamily?: string | null;
  customCss?: string | null;
}

export interface ThemeColorPreset {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

// Predefined color presets
export const THEME_COLOR_PRESETS: ThemeColorPreset[] = [
  {
    name: 'デフォルト',
    primaryColor: '#3b82f6',
    secondaryColor: '#64748b',
    accentColor: '#f59e0b',
  },
  {
    name: 'エメラルド',
    primaryColor: '#10b981',
    secondaryColor: '#6b7280',
    accentColor: '#8b5cf6',
  },
  {
    name: 'ローズ',
    primaryColor: '#f43f5e',
    secondaryColor: '#71717a',
    accentColor: '#06b6d4',
  },
  {
    name: 'インディゴ',
    primaryColor: '#6366f1',
    secondaryColor: '#78716c',
    accentColor: '#22c55e',
  },
  {
    name: 'アンバー',
    primaryColor: '#f59e0b',
    secondaryColor: '#57534e',
    accentColor: '#3b82f6',
  },
];

// Font family options
export const FONT_FAMILY_OPTIONS = [
  { value: 'system-ui', label: 'システムフォント' },
  { value: '"Noto Sans JP", sans-serif', label: 'Noto Sans JP' },
  { value: '"M PLUS 1p", sans-serif', label: 'M PLUS 1p' },
  { value: '"Roboto", sans-serif', label: 'Roboto' },
  { value: '"Inter", sans-serif', label: 'Inter' },
];

// Validation
export function validateBrandingData(data: UpdateBrandingData): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate color formats
  const colorRegex = /^#[0-9A-Fa-f]{6}$/;

  if (data.primaryColor !== undefined && data.primaryColor !== null) {
    if (!colorRegex.test(data.primaryColor)) {
      errors.push('プライマリカラーは有効な16進カラーコード（例: #3b82f6）である必要があります。');
    }
  }

  if (data.secondaryColor !== undefined && data.secondaryColor !== null) {
    if (!colorRegex.test(data.secondaryColor)) {
      errors.push('セカンダリカラーは有効な16進カラーコード（例: #64748b）である必要があります。');
    }
  }

  if (data.accentColor !== undefined && data.accentColor !== null) {
    if (!colorRegex.test(data.accentColor)) {
      errors.push('アクセントカラーは有効な16進カラーコード（例: #f59e0b）である必要があります。');
    }
  }

  // Validate URL formats
  const urlRegex = /^(https?:\/\/|\/)/;

  if (data.logoUrl !== undefined && data.logoUrl !== null) {
    if (!urlRegex.test(data.logoUrl)) {
      errors.push('ロゴURLは有効なURLである必要があります。');
    }
  }

  if (data.faviconUrl !== undefined && data.faviconUrl !== null) {
    if (!urlRegex.test(data.faviconUrl)) {
      errors.push('ファビコンURLは有効なURLである必要があります。');
    }
  }

  // Validate CSS
  if (data.customCss !== undefined && data.customCss !== null) {
    if (data.customCss.length > 50000) {
      errors.push('カスタムCSSは50000文字以内である必要があります。');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
