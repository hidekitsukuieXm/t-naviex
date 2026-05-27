/**
 * Combinatorial Testing Types Tests
 *
 * 組合せテスト型定義のテスト
 */

import { describe, it, expect } from 'vitest';
import {
  CombinatorialMethod,
  ConstraintType,
  CombinatorialParameter,
  getCombinatorialMethodLabel,
  getCombinatorialMethodDescription,
  getConstraintTypeLabel,
  createEmptyParameter,
  createEmptyParameterValue,
  createEmptyConstraint,
  calculateAllCombinationsCount,
  calculateAllPairsCount,
  getRecommendedOrthogonalArray,
  combinationsToCsv,
  calculateCombinationStatistics,
  generateTestCaseTitle,
  validateParameter,
  validateDefinition,
  STANDARD_ORTHOGONAL_ARRAYS,
  Combination,
} from '../combinatorial';

describe('Combinatorial Types', () => {
  describe('getCombinatorialMethodLabel', () => {
    it('should return correct label for PAIRWISE', () => {
      expect(getCombinatorialMethodLabel('PAIRWISE')).toBe('ペアワイズ（All-Pairs）');
    });

    it('should return correct label for ALL_COMBINATIONS', () => {
      expect(getCombinatorialMethodLabel('ALL_COMBINATIONS')).toBe('全組合せ');
    });

    it('should return correct label for ORTHOGONAL_ARRAY', () => {
      expect(getCombinatorialMethodLabel('ORTHOGONAL_ARRAY')).toBe('直交表');
    });

    it('should return correct label for N_WISE', () => {
      expect(getCombinatorialMethodLabel('N_WISE')).toBe('N-wise');
    });
  });

  describe('getCombinatorialMethodDescription', () => {
    it('should return description for PAIRWISE', () => {
      const desc = getCombinatorialMethodDescription('PAIRWISE');
      expect(desc).toContain('2パラメータ');
    });

    it('should return description for ALL_COMBINATIONS', () => {
      const desc = getCombinatorialMethodDescription('ALL_COMBINATIONS');
      expect(desc).toContain('全て');
    });
  });

  describe('getConstraintTypeLabel', () => {
    it('should return correct label for EXCLUDE', () => {
      expect(getConstraintTypeLabel('EXCLUDE')).toBe('禁止組合せ');
    });

    it('should return correct label for INCLUDE', () => {
      expect(getConstraintTypeLabel('INCLUDE')).toBe('必須組合せ');
    });

    it('should return correct label for IF_THEN', () => {
      expect(getConstraintTypeLabel('IF_THEN')).toBe('条件付き');
    });
  });

  describe('createEmptyParameter', () => {
    it('should create parameter with unique ID', () => {
      const param1 = createEmptyParameter(0);
      const param2 = createEmptyParameter(1);
      expect(param1.id).not.toBe(param2.id);
    });

    it('should create parameter with correct sort order', () => {
      const param = createEmptyParameter(5);
      expect(param.sortOrder).toBe(5);
      expect(param.name).toBe('パラメータ6');
    });

    it('should create parameter with two default values', () => {
      const param = createEmptyParameter(0);
      expect(param.values).toHaveLength(2);
      expect(param.values[0].value).toBe('値1');
      expect(param.values[1].value).toBe('値2');
    });

    it('should create values with unique IDs', () => {
      const param = createEmptyParameter(0);
      expect(param.values[0].id).not.toBe(param.values[1].id);
    });
  });

  describe('createEmptyParameterValue', () => {
    it('should create value with unique ID', () => {
      const value1 = createEmptyParameterValue();
      const value2 = createEmptyParameterValue();
      expect(value1.id).not.toBe(value2.id);
    });

    it('should create value with empty string', () => {
      const value = createEmptyParameterValue();
      expect(value.value).toBe('');
    });
  });

  describe('createEmptyConstraint', () => {
    it('should create constraint with unique ID', () => {
      const constraint1 = createEmptyConstraint();
      const constraint2 = createEmptyConstraint();
      expect(constraint1.id).not.toBe(constraint2.id);
    });

    it('should create constraint with EXCLUDE type by default', () => {
      const constraint = createEmptyConstraint();
      expect(constraint.type).toBe('EXCLUDE');
    });
  });

  describe('calculateAllCombinationsCount', () => {
    it('should return 0 for empty parameters', () => {
      expect(calculateAllCombinationsCount([])).toBe(0);
    });

    it('should return correct count for single parameter', () => {
      const params: CombinatorialParameter[] = [
        {
          id: '1',
          name: 'P1',
          values: [
            { id: 'v1', value: 'A' },
            { id: 'v2', value: 'B' },
            { id: 'v3', value: 'C' },
          ],
          sortOrder: 0,
        },
      ];
      expect(calculateAllCombinationsCount(params)).toBe(3);
    });

    it('should return correct count for multiple parameters', () => {
      const params: CombinatorialParameter[] = [
        {
          id: '1',
          name: 'P1',
          values: [
            { id: 'v1', value: 'A' },
            { id: 'v2', value: 'B' },
          ],
          sortOrder: 0,
        },
        {
          id: '2',
          name: 'P2',
          values: [
            { id: 'v3', value: 'X' },
            { id: 'v4', value: 'Y' },
            { id: 'v5', value: 'Z' },
          ],
          sortOrder: 1,
        },
      ];
      expect(calculateAllCombinationsCount(params)).toBe(6); // 2 * 3
    });

    it('should handle large parameter sets', () => {
      const params: CombinatorialParameter[] = [
        {
          id: '1',
          name: 'P1',
          values: [
            { id: 'v1', value: 'A' },
            { id: 'v2', value: 'B' },
          ],
          sortOrder: 0,
        },
        {
          id: '2',
          name: 'P2',
          values: [
            { id: 'v3', value: 'X' },
            { id: 'v4', value: 'Y' },
          ],
          sortOrder: 1,
        },
        {
          id: '3',
          name: 'P3',
          values: [
            { id: 'v5', value: '1' },
            { id: 'v6', value: '2' },
            { id: 'v7', value: '3' },
          ],
          sortOrder: 2,
        },
      ];
      expect(calculateAllCombinationsCount(params)).toBe(12); // 2 * 2 * 3
    });
  });

  describe('calculateAllPairsCount', () => {
    it('should return 0 for less than 2 parameters', () => {
      expect(calculateAllPairsCount([])).toBe(0);
      expect(
        calculateAllPairsCount([
          {
            id: '1',
            name: 'P1',
            values: [{ id: 'v1', value: 'A' }],
            sortOrder: 0,
          },
        ])
      ).toBe(0);
    });

    it('should return correct count for 2 parameters', () => {
      const params: CombinatorialParameter[] = [
        {
          id: '1',
          name: 'P1',
          values: [
            { id: 'v1', value: 'A' },
            { id: 'v2', value: 'B' },
          ],
          sortOrder: 0,
        },
        {
          id: '2',
          name: 'P2',
          values: [
            { id: 'v3', value: 'X' },
            { id: 'v4', value: 'Y' },
          ],
          sortOrder: 1,
        },
      ];
      expect(calculateAllPairsCount(params)).toBe(4); // 2 * 2
    });

    it('should return correct count for 3 parameters', () => {
      const params: CombinatorialParameter[] = [
        {
          id: '1',
          name: 'P1',
          values: [
            { id: 'v1', value: 'A' },
            { id: 'v2', value: 'B' },
          ],
          sortOrder: 0,
        },
        {
          id: '2',
          name: 'P2',
          values: [
            { id: 'v3', value: 'X' },
            { id: 'v4', value: 'Y' },
          ],
          sortOrder: 1,
        },
        {
          id: '3',
          name: 'P3',
          values: [
            { id: 'v5', value: '1' },
            { id: 'v6', value: '2' },
          ],
          sortOrder: 2,
        },
      ];
      // P1×P2: 2*2=4, P1×P3: 2*2=4, P2×P3: 2*2=4
      expect(calculateAllPairsCount(params)).toBe(12);
    });
  });

  describe('getRecommendedOrthogonalArray', () => {
    it('should return null for empty parameters', () => {
      expect(getRecommendedOrthogonalArray([])).toBeNull();
    });

    it('should recommend L4 for 3 parameters with 2 levels each', () => {
      const params: CombinatorialParameter[] = [
        {
          id: '1',
          name: 'P1',
          values: [
            { id: 'v1', value: 'A' },
            { id: 'v2', value: 'B' },
          ],
          sortOrder: 0,
        },
        {
          id: '2',
          name: 'P2',
          values: [
            { id: 'v3', value: 'X' },
            { id: 'v4', value: 'Y' },
          ],
          sortOrder: 1,
        },
        {
          id: '3',
          name: 'P3',
          values: [
            { id: 'v5', value: '1' },
            { id: 'v6', value: '2' },
          ],
          sortOrder: 2,
        },
      ];
      const recommended = getRecommendedOrthogonalArray(params);
      expect(recommended).not.toBeNull();
      expect(recommended?.id).toBe('L4_2_3');
    });

    it('should recommend L9 for 3-level parameters', () => {
      const params: CombinatorialParameter[] = [
        {
          id: '1',
          name: 'P1',
          values: [
            { id: 'v1', value: 'A' },
            { id: 'v2', value: 'B' },
            { id: 'v3', value: 'C' },
          ],
          sortOrder: 0,
        },
        {
          id: '2',
          name: 'P2',
          values: [
            { id: 'v4', value: 'X' },
            { id: 'v5', value: 'Y' },
            { id: 'v6', value: 'Z' },
          ],
          sortOrder: 1,
        },
      ];
      const recommended = getRecommendedOrthogonalArray(params);
      expect(recommended?.levels).toBeGreaterThanOrEqual(3);
    });
  });

  describe('combinationsToCsv', () => {
    it('should generate CSV with headers', () => {
      const params: CombinatorialParameter[] = [
        { id: '1', name: 'OS', values: [], sortOrder: 0 },
        { id: '2', name: 'Browser', values: [], sortOrder: 1 },
      ];
      const combinations: Combination[] = [
        {
          id: 'c1',
          index: 0,
          values: [
            { parameterId: '1', parameterName: 'OS', valueId: 'v1', value: 'Windows' },
            { parameterId: '2', parameterName: 'Browser', valueId: 'v2', value: 'Chrome' },
          ],
          isSelected: true,
        },
      ];
      const csv = combinationsToCsv(combinations, params);
      expect(csv).toContain('OS,Browser');
      expect(csv).toContain('"Windows"');
      expect(csv).toContain('"Chrome"');
    });

    it('should escape quotes in values', () => {
      const params: CombinatorialParameter[] = [
        { id: '1', name: 'Name', values: [], sortOrder: 0 },
      ];
      const combinations: Combination[] = [
        {
          id: 'c1',
          index: 0,
          values: [
            { parameterId: '1', parameterName: 'Name', valueId: 'v1', value: 'Test "Value"' },
          ],
          isSelected: true,
        },
      ];
      const csv = combinationsToCsv(combinations, params);
      expect(csv).toContain('""Value""');
    });
  });

  describe('calculateCombinationStatistics', () => {
    it('should calculate statistics correctly', () => {
      const params: CombinatorialParameter[] = [
        {
          id: '1',
          name: 'P1',
          values: [
            { id: 'v1', value: 'A' },
            { id: 'v2', value: 'B' },
          ],
          sortOrder: 0,
        },
        {
          id: '2',
          name: 'P2',
          values: [
            { id: 'v3', value: 'X' },
            { id: 'v4', value: 'Y' },
          ],
          sortOrder: 1,
        },
      ];
      const combinations: Combination[] = [
        {
          id: 'c1',
          index: 0,
          values: [
            { parameterId: '1', parameterName: 'P1', valueId: 'v1', value: 'A' },
            { parameterId: '2', parameterName: 'P2', valueId: 'v3', value: 'X' },
          ],
          isSelected: true,
        },
      ];
      const stats = calculateCombinationStatistics(combinations, params);
      expect(stats.totalCombinations).toBe(1);
      expect(stats.allCombinationsCount).toBe(4);
      expect(stats.reductionPercentage).toBe(75);
    });
  });

  describe('generateTestCaseTitle', () => {
    it('should generate title with default template', () => {
      const combination: Combination = {
        id: 'c1',
        index: 0,
        values: [
          { parameterId: '1', parameterName: 'OS', valueId: 'v1', value: 'Windows' },
          { parameterId: '2', parameterName: 'Browser', valueId: 'v2', value: 'Chrome' },
        ],
        isSelected: true,
      };
      const title = generateTestCaseTitle(combination);
      expect(title).toContain('1');
      expect(title).toContain('OS=Windows');
      expect(title).toContain('Browser=Chrome');
    });

    it('should support custom template', () => {
      const combination: Combination = {
        id: 'c1',
        index: 2,
        values: [{ parameterId: '1', parameterName: 'OS', valueId: 'v1', value: 'Mac' }],
        isSelected: true,
      };
      const title = generateTestCaseTitle(combination, 'テスト{index}: {OS}');
      expect(title).toBe('テスト3: Mac');
    });
  });

  describe('validateParameter', () => {
    it('should validate parameter with all required fields', () => {
      const param: CombinatorialParameter = {
        id: '1',
        name: 'TestParam',
        values: [{ id: 'v1', value: 'Value1' }],
        sortOrder: 0,
      };
      const result = validateParameter(param);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for empty name', () => {
      const param: CombinatorialParameter = {
        id: '1',
        name: '',
        values: [{ id: 'v1', value: 'Value1' }],
        sortOrder: 0,
      };
      const result = validateParameter(param);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('パラメータ名は必須です');
    });

    it('should fail for name exceeding 100 characters', () => {
      const param: CombinatorialParameter = {
        id: '1',
        name: 'a'.repeat(101),
        values: [{ id: 'v1', value: 'Value1' }],
        sortOrder: 0,
      };
      const result = validateParameter(param);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('100文字'))).toBe(true);
    });

    it('should fail for empty values array', () => {
      const param: CombinatorialParameter = {
        id: '1',
        name: 'TestParam',
        values: [],
        sortOrder: 0,
      };
      const result = validateParameter(param);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('1つ以上'))).toBe(true);
    });

    it('should fail for empty value string', () => {
      const param: CombinatorialParameter = {
        id: '1',
        name: 'TestParam',
        values: [{ id: 'v1', value: '' }],
        sortOrder: 0,
      };
      const result = validateParameter(param);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('空のパラメータ値'))).toBe(true);
    });

    it('should fail for duplicate values', () => {
      const param: CombinatorialParameter = {
        id: '1',
        name: 'TestParam',
        values: [
          { id: 'v1', value: 'Same' },
          { id: 'v2', value: 'Same' },
        ],
        sortOrder: 0,
      };
      const result = validateParameter(param);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('重複'))).toBe(true);
    });
  });

  describe('validateDefinition', () => {
    it('should validate complete definition', () => {
      const result = validateDefinition({
        name: 'Test Definition',
        parameters: [
          {
            id: '1',
            name: 'P1',
            values: [{ id: 'v1', value: 'A' }],
            sortOrder: 0,
          },
          {
            id: '2',
            name: 'P2',
            values: [{ id: 'v2', value: 'X' }],
            sortOrder: 1,
          },
        ],
        method: 'PAIRWISE',
      });
      expect(result.valid).toBe(true);
    });

    it('should fail for empty name', () => {
      const result = validateDefinition({
        name: '',
        parameters: [
          { id: '1', name: 'P1', values: [{ id: 'v1', value: 'A' }], sortOrder: 0 },
          { id: '2', name: 'P2', values: [{ id: 'v2', value: 'X' }], sortOrder: 1 },
        ],
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('名前'))).toBe(true);
    });

    it('should fail for less than 2 parameters', () => {
      const result = validateDefinition({
        name: 'Test',
        parameters: [{ id: '1', name: 'P1', values: [{ id: 'v1', value: 'A' }], sortOrder: 0 }],
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('2つ以上'))).toBe(true);
    });

    it('should fail for N_WISE without valid level', () => {
      const result = validateDefinition({
        name: 'Test',
        parameters: [
          { id: '1', name: 'P1', values: [{ id: 'v1', value: 'A' }], sortOrder: 0 },
          { id: '2', name: 'P2', values: [{ id: 'v2', value: 'X' }], sortOrder: 1 },
        ],
        method: 'N_WISE',
        nWiseLevel: 1,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('N-wise'))).toBe(true);
    });
  });

  describe('STANDARD_ORTHOGONAL_ARRAYS', () => {
    it('should have L4(2^3) array', () => {
      const l4 = STANDARD_ORTHOGONAL_ARRAYS.find((oa) => oa.id === 'L4_2_3');
      expect(l4).toBeDefined();
      expect(l4?.runs).toBe(4);
      expect(l4?.factors).toBe(3);
      expect(l4?.levels).toBe(2);
      expect(l4?.array).toHaveLength(4);
    });

    it('should have L8(2^7) array', () => {
      const l8 = STANDARD_ORTHOGONAL_ARRAYS.find((oa) => oa.id === 'L8_2_7');
      expect(l8).toBeDefined();
      expect(l8?.runs).toBe(8);
      expect(l8?.factors).toBe(7);
    });

    it('should have L9(3^4) array', () => {
      const l9 = STANDARD_ORTHOGONAL_ARRAYS.find((oa) => oa.id === 'L9_3_4');
      expect(l9).toBeDefined();
      expect(l9?.runs).toBe(9);
      expect(l9?.factors).toBe(4);
      expect(l9?.levels).toBe(3);
    });

    it('should have L16(2^15) array', () => {
      const l16 = STANDARD_ORTHOGONAL_ARRAYS.find((oa) => oa.id === 'L16_2_15');
      expect(l16).toBeDefined();
      expect(l16?.runs).toBe(16);
      expect(l16?.factors).toBe(15);
    });

    it('should have L27(3^13) array', () => {
      const l27 = STANDARD_ORTHOGONAL_ARRAYS.find((oa) => oa.id === 'L27_3_13');
      expect(l27).toBeDefined();
      expect(l27?.runs).toBe(27);
      expect(l27?.factors).toBe(13);
    });

    it('should have valid orthogonal property for L4', () => {
      const l4 = STANDARD_ORTHOGONAL_ARRAYS.find((oa) => oa.id === 'L4_2_3');
      expect(l4).toBeDefined();
      // Check that each column has balanced 0s and 1s
      for (let col = 0; col < 3; col++) {
        const zeros = l4!.array.filter((row) => row[col] === 0).length;
        const ones = l4!.array.filter((row) => row[col] === 1).length;
        expect(zeros).toBe(2);
        expect(ones).toBe(2);
      }
    });
  });
});
