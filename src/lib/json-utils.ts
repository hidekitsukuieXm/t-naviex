// JSON utilities for BigInt and Date serialization

/**
 * Serialize an object, converting BigInt to string and Date to ISO string
 */
export function serializeJson<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (typeof obj === 'bigint') {
    return obj.toString() as unknown as T;
  }
  if (obj instanceof Date) {
    return obj.toISOString() as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => serializeJson(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeJson(value);
    }
    return result as T;
  }
  return obj;
}

/**
 * Parse JSON with BigInt support
 */
export function parseJsonWithBigInt(json: string): unknown {
  return JSON.parse(json, (key, value) => {
    if (typeof value === 'string' && /^\d+n$/.test(value)) {
      return BigInt(value.slice(0, -1));
    }
    return value;
  });
}

/**
 * Stringify JSON with BigInt support
 */
export function stringifyJsonWithBigInt(obj: unknown): string {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString() + 'n';
    }
    return value;
  });
}

// Alias for backwards compatibility
export const serializeBigInt = serializeJson;
