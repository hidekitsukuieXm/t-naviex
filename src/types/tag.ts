// ============================================
// Tag Types
// ============================================

/**
 * Tag entity
 */
export interface Tag {
  id: string;
  projectId: string;
  name: string;
  color: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Tag with usage count
 */
export interface TagWithCount extends Tag {
  usageCount: number;
}

/**
 * Tag for test case display (minimal)
 */
export interface TestCaseTagInfo {
  id: string;
  name: string;
  color: string;
}

/**
 * Create tag input
 */
export interface CreateTagInput {
  projectId: string;
  name: string;
  color?: string;
  description?: string;
}

/**
 * Update tag input
 */
export interface UpdateTagInput {
  name?: string;
  color?: string;
  description?: string;
}

/**
 * Tag search parameters
 */
export interface TagSearchParams {
  projectId: string;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Tag list response
 */
export interface TagListResponse {
  tags: TagWithCount[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================
// Validation Constants
// ============================================

export const TAG_VALIDATION = {
  NAME_MIN_LENGTH: 1,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,
  COLOR_PATTERN: /^#[0-9A-Fa-f]{6}$/,
  DEFAULT_COLOR: '#3b82f6',
} as const;

// ============================================
// Validation Functions
// ============================================

/**
 * Validate tag name
 */
export function validateTagName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'タグ名は必須です。' };
  }

  const trimmed = name.trim();

  if (trimmed.length < TAG_VALIDATION.NAME_MIN_LENGTH) {
    return {
      valid: false,
      error: `タグ名は${TAG_VALIDATION.NAME_MIN_LENGTH}文字以上で入力してください。`,
    };
  }

  if (trimmed.length > TAG_VALIDATION.NAME_MAX_LENGTH) {
    return {
      valid: false,
      error: `タグ名は${TAG_VALIDATION.NAME_MAX_LENGTH}文字以下で入力してください。`,
    };
  }

  return { valid: true };
}

/**
 * Validate tag color
 */
export function validateTagColor(color: string): { valid: boolean; error?: string } {
  if (!color) {
    return { valid: true }; // Optional, will use default
  }

  if (!TAG_VALIDATION.COLOR_PATTERN.test(color)) {
    return {
      valid: false,
      error: 'カラーは「#RRGGBB」形式で入力してください。',
    };
  }

  return { valid: true };
}

/**
 * Validate tag description
 */
export function validateTagDescription(description: string | undefined | null): {
  valid: boolean;
  error?: string;
} {
  if (!description) {
    return { valid: true }; // Optional
  }

  if (description.length > TAG_VALIDATION.DESCRIPTION_MAX_LENGTH) {
    return {
      valid: false,
      error: `説明は${TAG_VALIDATION.DESCRIPTION_MAX_LENGTH}文字以下で入力してください。`,
    };
  }

  return { valid: true };
}

/**
 * Validate create tag input
 */
export function validateCreateTagInput(input: CreateTagInput): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  const nameValidation = validateTagName(input.name);
  if (!nameValidation.valid && nameValidation.error) {
    errors.name = nameValidation.error;
  }

  if (input.color) {
    const colorValidation = validateTagColor(input.color);
    if (!colorValidation.valid && colorValidation.error) {
      errors.color = colorValidation.error;
    }
  }

  if (input.description) {
    const descValidation = validateTagDescription(input.description);
    if (!descValidation.valid && descValidation.error) {
      errors.description = descValidation.error;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate update tag input
 */
export function validateUpdateTagInput(input: UpdateTagInput): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (input.name !== undefined) {
    const nameValidation = validateTagName(input.name);
    if (!nameValidation.valid && nameValidation.error) {
      errors.name = nameValidation.error;
    }
  }

  if (input.color !== undefined) {
    const colorValidation = validateTagColor(input.color);
    if (!colorValidation.valid && colorValidation.error) {
      errors.color = colorValidation.error;
    }
  }

  if (input.description !== undefined) {
    const descValidation = validateTagDescription(input.description);
    if (!descValidation.valid && descValidation.error) {
      errors.description = descValidation.error;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

// ============================================
// Preset Colors
// ============================================

export const TAG_PRESET_COLORS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Gray', value: '#6b7280' },
] as const;
