/**
 * Redmine API Client
 * Handles communication with Redmine REST API
 */

import { getDecryptedCredentials } from '@/repositories/external-integration-repository';

export interface RedmineUser {
  id: number;
  login: string;
  firstname: string;
  lastname: string;
  mail: string;
  admin: boolean;
}

export interface RedmineProject {
  id: number;
  name: string;
  identifier: string;
  description?: string;
  status: number;
  is_public: boolean;
}

export interface RedmineTracker {
  id: number;
  name: string;
}

export interface RedmineStatus {
  id: number;
  name: string;
  is_closed: boolean;
}

export interface RedminePriority {
  id: number;
  name: string;
  is_default: boolean;
}

export interface RedmineIssue {
  id: number;
  project: { id: number; name: string };
  tracker: { id: number; name: string };
  status: { id: number; name: string; is_closed?: boolean };
  priority: { id: number; name: string };
  author: { id: number; name: string };
  assigned_to?: { id: number; name: string };
  subject: string;
  description?: string;
  start_date?: string;
  due_date?: string;
  done_ratio?: number;
  estimated_hours?: number;
  created_on: string;
  updated_on: string;
  closed_on?: string;
  custom_fields?: Array<{
    id: number;
    name: string;
    value: string | string[];
  }>;
}

export interface RedmineIssueInput {
  project_id: number | string;
  tracker_id?: number;
  status_id?: number;
  priority_id?: number;
  subject: string;
  description?: string;
  assigned_to_id?: number;
  start_date?: string;
  due_date?: string;
  estimated_hours?: number;
  done_ratio?: number;
  custom_field_values?: Record<number, string | string[]>;
}

export interface RedmineResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

export class RedmineClient {
  private baseUrl: string;
  private apiKey: string | null;
  private username: string | null;
  private password: string | null;

  constructor(
    baseUrl: string,
    apiKey: string | null,
    username: string | null = null,
    password: string | null = null
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
    this.username = username;
    this.password = password;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['X-Redmine-API-Key'] = this.apiKey;
    } else if (this.username && this.password) {
      const credentials = Buffer.from(`${this.username}:${this.password}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    return headers;
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: unknown
  ): Promise<RedmineResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const options: RequestInit = {
        method,
        headers: this.getHeaders(),
      };

      if (body && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
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
  async getCurrentUser(): Promise<RedmineResponse<{ user: RedmineUser }>> {
    return this.request<{ user: RedmineUser }>('GET', '/users/current.json');
  }

  /**
   * Get list of projects
   */
  async getProjects(
    limit: number = 100,
    offset: number = 0
  ): Promise<
    RedmineResponse<{
      projects: RedmineProject[];
      total_count: number;
      offset: number;
      limit: number;
    }>
  > {
    return this.request('GET', `/projects.json?limit=${limit}&offset=${offset}`);
  }

  /**
   * Get project by ID or identifier
   */
  async getProject(
    idOrIdentifier: number | string
  ): Promise<RedmineResponse<{ project: RedmineProject }>> {
    return this.request('GET', `/projects/${idOrIdentifier}.json`);
  }

  /**
   * Get list of trackers
   */
  async getTrackers(): Promise<RedmineResponse<{ trackers: RedmineTracker[] }>> {
    return this.request('GET', '/trackers.json');
  }

  /**
   * Get list of issue statuses
   */
  async getIssueStatuses(): Promise<RedmineResponse<{ issue_statuses: RedmineStatus[] }>> {
    return this.request('GET', '/issue_statuses.json');
  }

  /**
   * Get list of issue priorities
   */
  async getIssuePriorities(): Promise<RedmineResponse<{ issue_priorities: RedminePriority[] }>> {
    return this.request('GET', '/enumerations/issue_priorities.json');
  }

  /**
   * Get issues for a project
   */
  async getIssues(
    projectId: number | string,
    options: {
      status_id?: string | number;
      tracker_id?: number;
      assigned_to_id?: number | 'me';
      limit?: number;
      offset?: number;
      sort?: string;
      updated_on?: string;
    } = {}
  ): Promise<
    RedmineResponse<{
      issues: RedmineIssue[];
      total_count: number;
      offset: number;
      limit: number;
    }>
  > {
    const params = new URLSearchParams();
    params.set('project_id', String(projectId));

    if (options.status_id !== undefined) params.set('status_id', String(options.status_id));
    if (options.tracker_id !== undefined) params.set('tracker_id', String(options.tracker_id));
    if (options.assigned_to_id !== undefined)
      params.set('assigned_to_id', String(options.assigned_to_id));
    if (options.limit !== undefined) params.set('limit', String(options.limit));
    if (options.offset !== undefined) params.set('offset', String(options.offset));
    if (options.sort) params.set('sort', options.sort);
    if (options.updated_on) params.set('updated_on', options.updated_on);

    return this.request('GET', `/issues.json?${params.toString()}`);
  }

  /**
   * Get a single issue by ID
   */
  async getIssue(issueId: number): Promise<RedmineResponse<{ issue: RedmineIssue }>> {
    return this.request('GET', `/issues/${issueId}.json?include=journals`);
  }

  /**
   * Create a new issue
   */
  async createIssue(issue: RedmineIssueInput): Promise<RedmineResponse<{ issue: RedmineIssue }>> {
    return this.request('POST', '/issues.json', { issue });
  }

  /**
   * Update an existing issue
   */
  async updateIssue(
    issueId: number,
    issue: Partial<RedmineIssueInput> & { notes?: string }
  ): Promise<RedmineResponse<{ issue: RedmineIssue }>> {
    return this.request('PUT', `/issues/${issueId}.json`, { issue });
  }

  /**
   * Delete an issue
   */
  async deleteIssue(issueId: number): Promise<RedmineResponse<void>> {
    return this.request('DELETE', `/issues/${issueId}.json`);
  }
}

/**
 * Create a RedmineClient from an integration ID
 */
export async function createRedmineClientFromIntegration(
  integrationId: bigint,
  integration: {
    baseUrl: string;
    username: string | null;
  }
): Promise<RedmineClient | null> {
  const credentials = await getDecryptedCredentials(integrationId);

  if (!credentials) {
    return null;
  }

  return new RedmineClient(
    integration.baseUrl,
    credentials.apiKey,
    integration.username,
    credentials.password
  );
}
