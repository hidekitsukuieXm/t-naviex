/**
 * Custom Field Types Tests
 */

import { describe, it, expect } from 'vitest';
import {
  CustomFieldType,
  CustomFieldTargetEntity,
  CUSTOM_FIELD_TYPE_INFO,
  TARGET_ENTITY_INFO,
} from '../custom-field';

describe('Custom Field Types', () => {
  describe('CustomFieldType', () => {
    it('すべてのフィールドタイプが定義されている', () => {
      expect(CustomFieldType.TEXT).toBe('TEXT');
      expect(CustomFieldType.NUMBER).toBe('NUMBER');
      expect(CustomFieldType.DATE).toBe('DATE');
      expect(CustomFieldType.SELECT_SINGLE).toBe('SELECT_SINGLE');
      expect(CustomFieldType.SELECT_MULTI).toBe('SELECT_MULTI');
      expect(CustomFieldType.CHECKBOX).toBe('CHECKBOX');
      expect(CustomFieldType.URL).toBe('URL');
      expect(CustomFieldType.EMAIL).toBe('EMAIL');
    });
  });

  describe('CustomFieldTargetEntity', () => {
    it('すべてのターゲットエンティティが定義されている', () => {
      expect(CustomFieldTargetEntity.TEST_CASE).toBe('TEST_CASE');
      expect(CustomFieldTargetEntity.BUG).toBe('BUG');
      expect(CustomFieldTargetEntity.TEST_SPEC).toBe('TEST_SPEC');
      expect(CustomFieldTargetEntity.TEST_RESULT).toBe('TEST_RESULT');
      expect(CustomFieldTargetEntity.TEST_RUN).toBe('TEST_RUN');
    });
  });

  describe('CUSTOM_FIELD_TYPE_INFO', () => {
    it('すべてのフィールドタイプの情報が定義されている', () => {
      const types = Object.keys(CUSTOM_FIELD_TYPE_INFO);
      expect(types).toContain('TEXT');
      expect(types).toContain('NUMBER');
      expect(types).toContain('DATE');
      expect(types).toContain('SELECT_SINGLE');
      expect(types).toContain('SELECT_MULTI');
      expect(types).toContain('CHECKBOX');
      expect(types).toContain('URL');
      expect(types).toContain('EMAIL');
    });

    it('TEXTの情報が正しい', () => {
      const info = CUSTOM_FIELD_TYPE_INFO.TEXT;
      expect(info.type).toBe('TEXT');
      expect(info.label).toBe('テキスト');
      expect(info.supportsOptions).toBe(false);
      expect(info.supportsDefaultValue).toBe(true);
      expect(info.supportsValidation).toBe(true);
    });

    it('NUMBERの情報が正しい', () => {
      const info = CUSTOM_FIELD_TYPE_INFO.NUMBER;
      expect(info.type).toBe('NUMBER');
      expect(info.label).toBe('数値');
      expect(info.supportsOptions).toBe(false);
      expect(info.supportsValidation).toBe(true);
    });

    it('SELECT_SINGLEの情報が正しい', () => {
      const info = CUSTOM_FIELD_TYPE_INFO.SELECT_SINGLE;
      expect(info.type).toBe('SELECT_SINGLE');
      expect(info.label).toBe('単一選択');
      expect(info.supportsOptions).toBe(true);
      expect(info.supportsValidation).toBe(false);
    });

    it('SELECT_MULTIの情報が正しい', () => {
      const info = CUSTOM_FIELD_TYPE_INFO.SELECT_MULTI;
      expect(info.type).toBe('SELECT_MULTI');
      expect(info.label).toBe('複数選択');
      expect(info.supportsOptions).toBe(true);
      expect(info.supportsValidation).toBe(false);
    });

    it('CHECKBOXの情報が正しい', () => {
      const info = CUSTOM_FIELD_TYPE_INFO.CHECKBOX;
      expect(info.type).toBe('CHECKBOX');
      expect(info.label).toBe('チェックボックス');
      expect(info.supportsOptions).toBe(false);
    });

    it('DATEの情報が正しい', () => {
      const info = CUSTOM_FIELD_TYPE_INFO.DATE;
      expect(info.type).toBe('DATE');
      expect(info.label).toBe('日付');
      expect(info.supportsValidation).toBe(true);
    });

    it('URLの情報が正しい', () => {
      const info = CUSTOM_FIELD_TYPE_INFO.URL;
      expect(info.type).toBe('URL');
      expect(info.label).toBe('URL');
    });

    it('EMAILの情報が正しい', () => {
      const info = CUSTOM_FIELD_TYPE_INFO.EMAIL;
      expect(info.type).toBe('EMAIL');
      expect(info.label).toBe('メールアドレス');
    });
  });

  describe('TARGET_ENTITY_INFO', () => {
    it('すべてのターゲットエンティティの情報が定義されている', () => {
      const entities = Object.keys(TARGET_ENTITY_INFO);
      expect(entities).toContain('TEST_CASE');
      expect(entities).toContain('BUG');
      expect(entities).toContain('TEST_SPEC');
      expect(entities).toContain('TEST_RESULT');
      expect(entities).toContain('TEST_RUN');
    });

    it('TEST_CASEの情報が正しい', () => {
      const info = TARGET_ENTITY_INFO.TEST_CASE;
      expect(info.entity).toBe('TEST_CASE');
      expect(info.label).toBe('テストケース');
    });

    it('BUGの情報が正しい', () => {
      const info = TARGET_ENTITY_INFO.BUG;
      expect(info.entity).toBe('BUG');
      expect(info.label).toBe('バグ');
    });

    it('TEST_SPECの情報が正しい', () => {
      const info = TARGET_ENTITY_INFO.TEST_SPEC;
      expect(info.entity).toBe('TEST_SPEC');
      expect(info.label).toBe('テスト仕様書');
    });

    it('TEST_RESULTの情報が正しい', () => {
      const info = TARGET_ENTITY_INFO.TEST_RESULT;
      expect(info.entity).toBe('TEST_RESULT');
      expect(info.label).toBe('テスト結果');
    });

    it('TEST_RUNの情報が正しい', () => {
      const info = TARGET_ENTITY_INFO.TEST_RUN;
      expect(info.entity).toBe('TEST_RUN');
      expect(info.label).toBe('テスト実行');
    });
  });
});
