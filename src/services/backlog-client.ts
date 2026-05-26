/**
 * Backlog API Client
 * Handles communication with Backlog REST API
 */

import { getDecryptedCredentials } from '@/repositories/external-integration-repository';

export interface BacklogUser {
  id: number;
  userId: string;
  name: string;
  roleType: number;
  lang: string | null;
  mailAddress: string;
}

export interface BacklogProject {
  id: number;
  projectKey: string;
  name: string;
  chartEnabled: boolean;
  subtaskingEnabled: boolean;
  textFormattingRule: string;
  archived: boolean;
}

export interface BacklogIssueType {
  id: number;
  projectId: number;
  name: string;
  color: string;
  displayOrder: number;
}

export interface BacklogStatus {
  id: number;
  projectId: number;
  name: string;
  color: string;
  displayOrder: number;
}

export interface BacklogPriority {
  id: number;
  name: string;
}

export interface BacklogIssue {
  id: number;
  projectId: number;
  issueKey: string;
  keyId: number;
  issueType: { id: number; projectId: number; name: string; color: string };
  summary: string;
  description: string | null;
  priority: { id: number; name: string };
  status: { id: number; projectId: number; name: string; color: string };
  assignee: BacklogUser | null;
  createdUser: BacklogUser;
  created: string;
  updated: string;
  startDate: string | null;
  dueDate: string | null;
  estimatedHours: number | null;
  actualHours: number | null;
  parentIssueId: number | null;
}

export interface BacklogIssueInput {
  projectId: number;
  summary: string;
  issueTypeId: number;
  priorityId: number;
  description?: string;
  startDate?: string;
  dueDate?: string;
  estimatedHours?: number;
  assigneeId?: number;
  statusId?: number;
}

export interface BacklogResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

export class BacklogClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    endpoint: string,
    body?: unknown
  ): Promise<BacklogResponse<T>> {
    try {
      const separator = endpoint.includes('?') ? '&' : '?';
      const url = `${this.baseUrl}/api/v2${endpoint}${separator}apiKey=${this.apiKey}`;

      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (body && (method === 'POST' || method === 'PATCH')) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.errors?.map((e: { message: string }) => e.message).join(', ') ||
          `HTTP ${response.status}`;
        return {
          success: false,
          error: errorMessage,
          status: response.status,
        };
      }

      // DELETE may return empty response
      if (method === 'DELETE' || response.status === 204) {
        return { success: true };
      }

      const data = await response.json();
      return { success: true, data: data as T };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get current user information
   */
  async getCurrentUser(): Promise<BacklogResponse<BacklogUser>> {
    return this.request<BacklogUser>('GET', '/users/myself');
  }

  /**
   * Get list of projects
   */
  async getProjects(): Promise<BacklogResponse<BacklogProject[]>> {
    return this.request<BacklogProject[]>('GET', '/projects');
  }

  /**
   * Get project by ID or key
   */
  async getProject(projectIdOrKey: number | string): Promise<BacklogResponse<BacklogProject>> {
    return this.request<BacklogProject>('GET', `/projects/${projectIdOrKey}`);
  }

  /**
   * Get issue types for a project
   */
  async getIssueTypes(
    projectIdOrKey: number | string
  ): Promise<BacklogResponse<BacklogIssueType[]>> {
    return this.request<BacklogIssueType[]>('GET', `/projects/${projectIdOrKey}/issueTypes`);
  }

  /**
   * Get statuses for a project
   */
  async getStatuses(projectIdOrKey: number | string): Promise<BacklogResponse<BacklogStatus[]>> {
    return this.request<BacklogStatus[]>('GET', `/projects/${projectIdOrKey}/statuses`);
  }

  /**
   * Get list of priorities
   */
  async getPriorities(): Promise<BacklogResponse<BacklogPriority[]>> {
    return this.request<BacklogPriority[]>('GET', '/priorities');
  }

  /**
   * Get issues for a project
   */
  async getIssues(
    projectId: number,
    options: {
      statusId?: number[];
      issueTypeId?: number[];
      assigneeId?: number[];
      count?: number;
      offset?: number;
      sort?: string;
      order?: 'asc' | 'desc';
    } = {}
  ): Promise<BacklogResponse<BacklogIssue[]>> {
    const params = new URLSearchParams();
    params.set('projectId[]', String(projectId));

    if (options.statusId) {
      options.statusId.forEach((id) => params.append('statusId[]', String(id)));
    }
    if (options.issueTypeId) {
      options.issueTypeId.forEach((id) => params.append('issueTypeId[]', String(id)));
    }
    if (options.assigneeId) {
      options.assigneeId.forEach((id) => params.append('assigneeId[]', String(id)));
    }
    if (options.count !== undefined) params.set('count', String(options.count));
    if (options.offset !== undefined) params.set('offset', String(options.offset));
    if (options.sort) params.set('sort', options.sort);
    if (options.order) params.set('order', options.order);

    return this.request<BacklogIssue[]>('GET', `/issues?${params.toString()}`);
  }

  /**
   * Get issue count for a project
   */
  async getIssueCount(projectId: number): Promise<BacklogResponse<{ count: number }>> {
    return this.request<{ count: number }>('GET', `/issues/count?projectId[]=${projectId}`);
  }

  /**
   * Get a single issue by ID or key
   */
  async getIssue(issueIdOrKey: number | string): Promise<BacklogResponse<BacklogIssue>> {
    return this.request<BacklogIssue>('GET', `/issues/${issueIdOrKey}`);
  }

  /**
   * Create a new issue
   */
  async createIssue(issue: BacklogIssueInput): Promise<BacklogResponse<BacklogIssue>> {
    return this.request<BacklogIssue>('POST', '/issues', issue);
  }

  /**
   * Update an existing issue
   */
  async updateIssue(
    issueIdOrKey: number | string,
    issue: Partial<Omit<BacklogIssueInput, 'projectId'>> & { comment?: string }
  ): Promise<BacklogResponse<BacklogIssue>> {
    return this.request<BacklogIssue>('PATCH', `/issues/${issueIdOrKey}`, issue);
  }

  /**
   * Delete an issue
   */
  async deleteIssue(issueIdOrKey: number | string): Promise<BacklogResponse<void>> {
    return this.request<void>('DELETE', `/issues/${issueIdOrKey}`);
  }
}

/**
 * Create a BacklogClient from an integration ID
 */
export async function createBacklogClientFromIntegration(
  integrationId: bigint,
  integration: {
    baseUrl: string;
  }
): Promise<BacklogClient | null> {
  const credentials = await getDecryptedCredentials(integrationId);

  if (!credentials?.apiKey) {
    return null;
  }

  return new BacklogClient(integration.baseUrl, credentials.apiKey);
}
