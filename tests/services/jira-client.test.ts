/**
 * Jira Client Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JiraClient } from '@/services/jira-client';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('JiraClient', () => {
  let client: JiraClient;
  const baseUrl = 'https://test.atlassian.net';
  const username = 'test@example.com';
  const apiToken = 'test-api-token';

  beforeEach(() => {
    vi.clearAllMocks();
    client = new JiraClient(baseUrl, username, apiToken);
  });

  describe('constructor', () => {
    it('should detect Jira Cloud from atlassian.net domain', () => {
      const cloudClient = new JiraClient('https://mycompany.atlassian.net', username, apiToken);
      expect(cloudClient).toBeDefined();
    });

    it('should detect Jira Server from custom domain', () => {
      const serverClient = new JiraClient('https://jira.mycompany.com', username, apiToken);
      expect(serverClient).toBeDefined();
    });

    it('should remove trailing slash from baseUrl', () => {
      const clientWithSlash = new JiraClient('https://test.atlassian.net/', username, apiToken);
      expect(clientWithSlash).toBeDefined();
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user on success', async () => {
      const mockUser = {
        accountId: 'abc123',
        displayName: 'Test User',
        emailAddress: 'test@example.com',
        active: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      });

      const result = await client.getCurrentUser();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUser);
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/rest/api/3/myself`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: expect.stringMatching(/^Basic /),
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should return error on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ errorMessages: ['Unauthorized'] }),
      });

      const result = await client.getCurrentUser();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized');
      expect(result.status).toBe(401);
    });
  });

  describe('getProjects', () => {
    it('should return list of projects', async () => {
      const mockProjects = [
        { id: '10000', key: 'TEST', name: 'Test Project' },
        { id: '10001', key: 'DEMO', name: 'Demo Project' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjects,
      });

      const result = await client.getProjects();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProjects);
    });

    it('should support pagination options', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await client.getProjects({ startAt: 10, maxResults: 5 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('startAt=10'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('maxResults=5'),
        expect.any(Object)
      );
    });
  });

  describe('getStatuses', () => {
    it('should return list of statuses', async () => {
      const mockStatuses = [
        {
          id: '1',
          name: 'Open',
          statusCategory: { id: 2, key: 'new', name: 'To Do', colorName: 'blue-gray' },
        },
        {
          id: '3',
          name: 'In Progress',
          statusCategory: { id: 4, key: 'indeterminate', name: 'In Progress', colorName: 'yellow' },
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatuses,
      });

      const result = await client.getStatuses();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStatuses);
    });
  });

  describe('searchIssues', () => {
    it('should search issues with JQL', async () => {
      const mockSearchResult = {
        expand: 'schema,names',
        startAt: 0,
        maxResults: 50,
        total: 2,
        issues: [
          {
            id: '10001',
            key: 'TEST-1',
            self: `${baseUrl}/rest/api/3/issue/10001`,
            fields: {
              summary: 'Test Issue 1',
              status: { id: '1', name: 'Open' },
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchResult,
      });

      const result = await client.searchIssues('project = TEST');

      expect(result.success).toBe(true);
      expect(result.data?.total).toBe(2);
      expect(result.data?.issues).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/rest/api/3/search`,
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('project = TEST'),
        })
      );
    });
  });

  describe('getIssues', () => {
    it('should get issues for a project', async () => {
      const mockSearchResult = {
        expand: 'schema,names',
        startAt: 0,
        maxResults: 25,
        total: 1,
        issues: [
          {
            id: '10001',
            key: 'TEST-1',
            self: `${baseUrl}/rest/api/3/issue/10001`,
            fields: {
              summary: 'Test Issue',
              status: { id: '1', name: 'Open' },
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchResult,
      });

      const result = await client.getIssues('TEST', { status: 'Open', maxResults: 25 });

      expect(result.success).toBe(true);
      expect(result.data?.issues).toHaveLength(1);
    });
  });

  describe('getIssue', () => {
    it('should get a single issue by key', async () => {
      const mockIssue = {
        id: '10001',
        key: 'TEST-1',
        self: `${baseUrl}/rest/api/3/issue/10001`,
        fields: {
          summary: 'Test Issue',
          description: 'Test description',
          status: { id: '1', name: 'Open' },
          priority: { id: '3', name: 'Medium' },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockIssue,
      });

      const result = await client.getIssue('TEST-1');

      expect(result.success).toBe(true);
      expect(result.data?.key).toBe('TEST-1');
      expect(result.data?.fields.summary).toBe('Test Issue');
    });

    it('should return error for non-existent issue', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ errorMessages: ['Issue does not exist'] }),
      });

      const result = await client.getIssue('TEST-999');

      expect(result.success).toBe(false);
      expect(result.status).toBe(404);
    });
  });

  describe('createIssue', () => {
    it('should create a new issue', async () => {
      const mockCreateResponse = {
        id: '10002',
        key: 'TEST-2',
        self: `${baseUrl}/rest/api/3/issue/10002`,
      };

      const mockIssue = {
        id: '10002',
        key: 'TEST-2',
        self: `${baseUrl}/rest/api/3/issue/10002`,
        fields: {
          summary: 'New Bug',
          description: 'Bug description',
          issuetype: { id: '10004', name: 'Bug' },
          project: { key: 'TEST' },
          status: { id: '1', name: 'Open' },
        },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockCreateResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockIssue,
        });

      const result = await client.createIssue({
        fields: {
          project: { key: 'TEST' },
          summary: 'New Bug',
          description: 'Bug description',
          issuetype: { id: '10004' },
        },
      });

      expect(result.success).toBe(true);
      expect(result.data?.key).toBe('TEST-2');
    });
  });

  describe('updateIssue', () => {
    it('should update an existing issue', async () => {
      const mockIssue = {
        id: '10001',
        key: 'TEST-1',
        self: `${baseUrl}/rest/api/3/issue/10001`,
        fields: {
          summary: 'Updated Summary',
          status: { id: '1', name: 'Open' },
        },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 204,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockIssue,
        });

      const result = await client.updateIssue('TEST-1', {
        fields: { summary: 'Updated Summary' },
      });

      expect(result.success).toBe(true);
      expect(result.data?.fields.summary).toBe('Updated Summary');
    });
  });

  describe('deleteIssue', () => {
    it('should delete an issue', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const result = await client.deleteIssue('TEST-1');

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/rest/api/3/issue/TEST-1`,
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('getTransitions', () => {
    it('should get available transitions for an issue', async () => {
      const mockTransitions = {
        transitions: [
          { id: '11', name: 'To Do', to: { id: '1', name: 'To Do' } },
          { id: '21', name: 'In Progress', to: { id: '3', name: 'In Progress' } },
          { id: '31', name: 'Done', to: { id: '10001', name: 'Done' } },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTransitions,
      });

      const result = await client.getTransitions('TEST-1');

      expect(result.success).toBe(true);
      expect(result.data?.transitions).toHaveLength(3);
    });
  });

  describe('transitionIssue', () => {
    it('should transition an issue to a new status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const result = await client.transitionIssue('TEST-1', '21');

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/rest/api/3/issue/TEST-1/transitions`,
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"transition":{"id":"21"}'),
        })
      );
    });

    it('should add comment when transitioning', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const result = await client.transitionIssue('TEST-1', '21', {
        comment: 'Moving to in progress',
      });

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('Moving to in progress'),
        })
      );
    });
  });

  describe('addComment', () => {
    it('should add a comment to an issue', async () => {
      const mockComment = {
        id: '10000',
        body: 'Test comment',
        created: '2024-01-01T00:00:00.000Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockComment,
      });

      const result = await client.addComment('TEST-1', 'Test comment');

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/rest/api/3/issue/TEST-1/comment`,
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

      const result = await client.getCurrentUser();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should handle JSON parse errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const result = await client.getCurrentUser();

      expect(result.success).toBe(false);
      expect(result.error).toBe('HTTP 500');
    });

    it('should handle multiple error messages', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          errorMessages: ['Error 1', 'Error 2'],
        }),
      });

      const result = await client.getCurrentUser();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Error 1, Error 2');
    });

    it('should handle field-specific errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          errors: {
            summary: 'Summary is required',
            priority: 'Invalid priority',
          },
        }),
      });

      const result = await client.createIssue({
        fields: {
          project: { key: 'TEST' },
          summary: '',
          issuetype: { id: '10004' },
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Summary is required');
      expect(result.error).toContain('Invalid priority');
    });
  });
});
