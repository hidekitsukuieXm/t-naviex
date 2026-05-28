import { describe, it, expect } from 'vitest';
import { GET as getOpenAPISpec } from '../openapi.json/route';
import { GET as getSwaggerUI } from '../route';

describe('API Documentation', () => {
  describe('GET /api/docs/openapi.json', () => {
    it('should return OpenAPI specification', async () => {
      const response = await getOpenAPISpec();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.openapi).toBe('3.0.3');
      expect(data.info.title).toBe('T-NaviEx REST API');
      expect(data.info.version).toBe('1.0.0');
    });

    it('should include all required paths', async () => {
      const response = await getOpenAPISpec();
      const data = await response.json();

      expect(data.paths['/projects']).toBeDefined();
      expect(data.paths['/test-specs']).toBeDefined();
      expect(data.paths['/test-cases']).toBeDefined();
      expect(data.paths['/test-runs']).toBeDefined();
      expect(data.paths['/bugs']).toBeDefined();
    });

    it('should include security schemes', async () => {
      const response = await getOpenAPISpec();
      const data = await response.json();

      expect(data.components?.securitySchemes?.ApiKeyAuth).toBeDefined();
      expect(data.components.securitySchemes.ApiKeyAuth.type).toBe('apiKey');
      expect(data.components.securitySchemes.ApiKeyAuth.in).toBe('header');
    });

    it('should include component schemas', async () => {
      const response = await getOpenAPISpec();
      const data = await response.json();

      expect(data.components?.schemas?.Project).toBeDefined();
      expect(data.components?.schemas?.TestCase).toBeDefined();
      expect(data.components?.schemas?.TestRun).toBeDefined();
      expect(data.components?.schemas?.Bug).toBeDefined();
    });
  });

  describe('GET /api/docs', () => {
    it('should return Swagger UI HTML', async () => {
      const response = await getSwaggerUI();
      const html = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/html');
      expect(html).toContain('swagger-ui');
      expect(html).toContain('/api/docs/openapi.json');
    });
  });
});
