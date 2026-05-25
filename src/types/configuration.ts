import { z } from 'zod';

// Configuration status constants
export const CONFIGURATION_NAME_MAX_LENGTH = 255;
export const CONFIGURATION_DESCRIPTION_MAX_LENGTH = 2000;

// Configuration params schema
export const configParamsSchema = z
  .object({
    os: z.string().optional(),
    osVersion: z.string().optional(),
    browser: z.string().optional(),
    browserVersion: z.string().optional(),
    device: z.string().optional(),
    deviceType: z.string().optional(),
    resolution: z.string().optional(),
    locale: z.string().optional(),
    timezone: z.string().optional(),
    custom: z.record(z.string()).optional(),
  })
  .passthrough();

export type ConfigParams = z.infer<typeof configParamsSchema>;

// Configuration type
export interface Configuration {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  configParams: ConfigParams;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Validation schemas
export const configurationNameSchema = z
  .string()
  .min(1, 'コンフィギュレーション名は必須です。')
  .max(
    CONFIGURATION_NAME_MAX_LENGTH,
    `コンフィギュレーション名は${CONFIGURATION_NAME_MAX_LENGTH}文字以内で入力してください。`
  )
  .refine((val) => val.trim().length > 0, {
    message: 'コンフィギュレーション名は空白のみでは登録できません。',
  });

export const configurationDescriptionSchema = z
  .string()
  .max(
    CONFIGURATION_DESCRIPTION_MAX_LENGTH,
    `説明は${CONFIGURATION_DESCRIPTION_MAX_LENGTH}文字以内で入力してください。`
  )
  .nullable()
  .optional();

// Validation functions
export function validateConfigurationName(name: string): { valid: boolean; error?: string } {
  const result = configurationNameSchema.safeParse(name);
  if (result.success) {
    return { valid: true };
  }
  return { valid: false, error: result.error.issues[0]?.message };
}

export function validateConfigurationDescription(description: string | null): {
  valid: boolean;
  error?: string;
} {
  const result = configurationDescriptionSchema.safeParse(description);
  if (result.success) {
    return { valid: true };
  }
  return { valid: false, error: result.error.issues[0]?.message };
}

export function validateConfigParams(params: unknown): { valid: boolean; error?: string } {
  const result = configParamsSchema.safeParse(params);
  if (result.success) {
    return { valid: true };
  }
  return { valid: false, error: result.error.issues[0]?.message };
}

// Create/Update input types
export interface CreateConfigurationInput {
  projectId: string;
  name: string;
  description?: string | null;
  configParams?: ConfigParams;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateConfigurationInput {
  name?: string;
  description?: string | null;
  configParams?: ConfigParams;
  sortOrder?: number;
  isActive?: boolean;
}

// List filter types
export interface ConfigurationListFilter {
  isActive?: boolean;
  search?: string;
}

export interface ConfigurationListOptions extends ConfigurationListFilter {
  sortBy?: 'name' | 'sortOrder' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

// Create input validation schema
export const createConfigurationInputSchema = z.object({
  projectId: z.string().min(1, 'プロジェクトIDは必須です。'),
  name: configurationNameSchema,
  description: configurationDescriptionSchema,
  configParams: configParamsSchema.optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

// Update input validation schema
export const updateConfigurationInputSchema = z.object({
  name: configurationNameSchema.optional(),
  description: configurationDescriptionSchema,
  configParams: configParamsSchema.optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

// Validation functions for API
export function validateCreateConfigurationInput(input: unknown): {
  valid: boolean;
  data?: CreateConfigurationInput;
  errors?: Record<string, string>;
} {
  const result = createConfigurationInputSchema.safeParse(input);
  if (result.success) {
    return { valid: true, data: result.data as CreateConfigurationInput };
  }

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.');
    errors[path] = issue.message;
  }
  return { valid: false, errors };
}

export function validateUpdateConfigurationInput(input: unknown): {
  valid: boolean;
  data?: UpdateConfigurationInput;
  errors?: Record<string, string>;
} {
  const result = updateConfigurationInputSchema.safeParse(input);
  if (result.success) {
    return { valid: true, data: result.data as UpdateConfigurationInput };
  }

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.');
    errors[path] = issue.message;
  }
  return { valid: false, errors };
}
