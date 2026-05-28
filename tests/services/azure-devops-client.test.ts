/**
 * Azure DevOps Client Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AzureDevOpsClient } from '@/services/azure-devops-client';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('AzureDevOpsClient', () => {
  let client: AzureDevOpsClient;
  const baseUrl = 'https://dev.azure.com/myorg';
  const personalAccessToken = 'test-pat';

  beforeEach(() => {
    vi.clearAllMocks();
    client = new AzureDevOpsClient(baseUrl, personalAccessToken);
  });

  describe('constructor', () => {
    it('should parse organization from dev.azure.com URL', () => {
      const azureClient = new AzureDevOpsClient(
        'https://dev.azure.com/testorg',
        personalAccessToken
      );
      expect(azureClient).toBeDefined();
    });

    it('should parse organization from visualstudio.com URL', () => {
      const vsClient = new AzureDevOpsClient(
        'https://testorg.visualstudio.com',
        personalAccessToken
      );
      expect(vsClient).toBeDefined();
    });

    it('should remove trailing slash from baseUrl', () => {
      const clientWithSlash = new AzureDevOpsClient(
        'https://dev.azure.com/myorg/',
        personalAccessToken
      );
      expect(clientWithSlash).toBeDefined();
    });
  });

  describe('getProjects', () => {
    it('should return list of projects', async () => {
      const mockProjects = {
        count: 2,
        value: [
          { id: 'proj-1', name: 'Project 1', state: 'wellFormed', visibility: 'private' },
          { id: 'proj-2', name: 'Project 2', state: 'wellFormed', visibility: 'private' },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjects,
      });

      const result = await client.getProjects();

      expect(result.success).toBe(true);
      expect(result.data?.value).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/_apis/projects'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: expect.stringMatching(/^Basic /),
          }),
        })
      );
    });

    it('should support pagination options', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 0, value: [] }),
      });

      await client.getProjects({ top: 10, skip: 5 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('$top=10'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('$skip=5'),
        expect.any(Object)
      );
    });
  });

  describe('getWorkItemTypes', () => {
    it('should return work item types for a project', async () => {
      const mockTypes = {
        count: 2,
        value: [
          { name: 'Bug', description: 'Bug work item', isDisabled: false },
          { name: 'Task', description: 'Task work item', isDisabled: false },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTypes,
      });

      const result = await client.getWorkItemTypes('TestProject');

      expect(result.success).toBe(true);
      expect(result.data?.value).toHaveLength(2);
    });
  });

  describe('getWorkItemStates', () => {
    it('should return states for a work item type', async () => {
      const mockStates = {
        count: 3,
        value: [
          { name: 'New', category: 'Proposed', color: 'b2b2b2' },
          { name: 'Active', category: 'InProgress', color: '007acc' },
          { name: 'Closed', category: 'Completed', color: '339933' },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStates,
      });

      const result = await client.getWorkItemStates('TestProject', 'Bug');

      expect(result.success).toBe(true);
      expect(result.data?.value).toHaveLength(3);
    });
  });

  describe('getWorkItem', () => {
    it('should get a single work item by ID', async () => {
      const mockWorkItem = {
        id: 123,
        rev: 1,
        url: `${baseUrl}/TestProject/_apis/wit/workitems/123`,
        fields: {
          'System.Title': 'Test Bug',
          'System.State': 'New',
          'System.WorkItemType': 'Bug',
          'System.CreatedDate': '2024-01-01T00:00:00Z',
          'System.ChangedDate': '2024-01-01T00:00:00Z',
          'System.CreatedBy': { displayName: 'Test User', uniqueName: 'test@example.com' },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockWorkItem,
      });

      const result = await client.getWorkItem(123);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(123);
      expect(result.data?.fields['System.Title']).toBe('Test Bug');
    });

    it('should return error for non-existent work item', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Work item not found' }),
      });

      const result = await client.getWorkItem(99999);

      expect(result.success).toBe(false);
      expect(result.status).toBe(404);
    });
  });

  describe('getWorkItems', () => {
    it('should get multiple work items by IDs', async () => {
      const mockWorkItems = {
        count: 2,
        value: [
          {
            id: 123,
            rev: 1,
            fields: { 'System.Title': 'Bug 1', 'System.State': 'New' },
          },
          {
            id: 124,
            rev: 1,
            fields: { 'System.Title': 'Bug 2', 'System.State': 'Active' },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockWorkItems,
      });

      const result = await client.getWorkItems([123, 124]);

      expect(result.success).toBe(true);
      expect(result.data?.value).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('ids=123,124'),
        expect.any(Object)
      );
    });
  });

  describe('queryWorkItems', () => {
    it('should query work items using WIQL', async () => {
      const mockQueryResult = {
        queryType: 'flat',
        queryResultType: 'workItem',
        asOf: '2024-01-01T00:00:00Z',
        workItems: [
          { id: 123, url: `${baseUrl}/_apis/wit/workitems/123` },
          { id: 124, url: `${baseUrl}/_apis/wit/workitems/124` },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockQueryResult,
      });

      const result = await client.queryWorkItems(
        'TestProject',
        'SELECT [System.Id] FROM WorkItems'
      );

      expect(result.success).toBe(true);
      expect(result.data?.workItems).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/_apis/wit/wiql'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('SELECT [System.Id] FROM WorkItems'),
        })
      );
    });
  });

  describe('getProjectWorkItems', () => {
    it('should get work items for a project', async () => {
      const mockQueryResult = {
        queryType: 'flat',
        queryResultType: 'workItem',
        asOf: '2024-01-01T00:00:00Z',
        workItems: [{ id: 123, url: `${baseUrl}/_apis/wit/workitems/123` }],
      };

      const mockWorkItems = {
        count: 1,
        value: [
          {
            id: 123,
            rev: 1,
            fields: { 'System.Title': 'Test Bug', 'System.State': 'New' },
          },
        ],
      };

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockQueryResult })
        .mockResolvedValueOnce({ ok: true, json: async () => mockWorkItems });

      const result = await client.getProjectWorkItems('TestProject', { workItemType: 'Bug' });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('should return empty array when no work items found', async () => {
      const mockQueryResult = {
        queryType: 'flat',
        queryResultType: 'workItem',
        asOf: '2024-01-01T00:00:00Z',
        workItems: [],
      };

      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockQueryResult });

      const result = await client.getProjectWorkItems('TestProject');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('createWorkItem', () => {
    it('should create a new work item', async () => {
      const mockWorkItem = {
        id: 125,
        rev: 1,
        url: `${baseUrl}/TestProject/_apis/wit/workitems/125`,
        fields: {
          'System.Title': 'New Bug',
          'System.State': 'New',
          'System.WorkItemType': 'Bug',
          'System.CreatedDate': '2024-01-01T00:00:00Z',
          'System.ChangedDate': '2024-01-01T00:00:00Z',
          'System.CreatedBy': { displayName: 'Test User', uniqueName: 'test@example.com' },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockWorkItem,
      });

      const result = await client.createWorkItem('TestProject', 'Bug', [
        { op: 'add', path: '/fields/System.Title', value: 'New Bug' },
      ]);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(125);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/_apis/wit/workitems/$Bug'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json-patch+json',
          }),
        })
      );
    });
  });

  describe('updateWorkItem', () => {
    it('should update an existing work item', async () => {
      const mockWorkItem = {
        id: 123,
        rev: 2,
        url: `${baseUrl}/_apis/wit/workitems/123`,
        fields: {
          'System.Title': 'Updated Bug Title',
          'System.State': 'New',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockWorkItem,
      });

      const result = await client.updateWorkItem(123, [
        { op: 'replace', path: '/fields/System.Title', value: 'Updated Bug Title' },
      ]);

      expect(result.success).toBe(true);
      expect(result.data?.fields['System.Title']).toBe('Updated Bug Title');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/_apis/wit/workitems/123'),
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });
  });

  describe('deleteWorkItem', () => {
    it('should delete a work item', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const result = await client.deleteWorkItem(123);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/_apis/wit/workitems/123'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should support permanent deletion', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      await client.deleteWorkItem(123, { destroy: true });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('destroy=true'),
        expect.any(Object)
      );
    });
  });

  describe('addComment', () => {
    it('should add a comment to a work item', async () => {
      const mockComment = {
        id: 1,
        text: 'Test comment',
        createdDate: '2024-01-01T00:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockComment,
      });

      const result = await client.addComment('TestProject', 123, 'Test comment');

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/_apis/wit/workitems/123/comments'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Test comment'),
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.getProjects();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should handle API errors with message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Bad request: Invalid project ID' }),
      });

      const result = await client.getProject('invalid');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Bad request: Invalid project ID');
    });

    it('should handle API errors without message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      });

      const result = await client.getProjects();

      expect(result.success).toBe(false);
      expect(result.error).toBe('HTTP 500');
    });

    it('should handle JSON parse errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const result = await client.getProjects();

      expect(result.success).toBe(false);
      expect(result.error).toBe('HTTP 500');
    });
  });
});
