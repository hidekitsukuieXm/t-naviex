/**
 * Jira API Client
 * Handles communication with Jira REST API (Cloud & Server)
 */

import { getDecryptedCredentials } from '@/repositories/external-integration-repository';

export interface JiraUser {
  accountId?: string; // Cloud
  key?: string; // Server
  name?: string;
  displayName: string;
  emailAddress?: string;
  avatarUrls?: Record<string, string>;
  active: boolean;
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  description?: string;
  projectTypeKey?: string;
  lead?: JiraUser;
}

export interface JiraIssueType {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
  subtask: boolean;
}

export interface JiraStatus {
  id: string;
  name: string;
  description?: string;
  statusCategory: {
    id: number;
    key: string;
    name: string;
    colorName: string;
  };
}

export interface JiraPriority {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
}

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    description?: string | null;
    issuetype: JiraIssueType;
    project: JiraProject;
    status: JiraStatus;
    priority?: JiraPriority;
    assignee?: JiraUser | null;
    reporter?: JiraUser | null;
    created: string;
    updated: string;
    duedate?: string | null;
    resolution?: { id: string; name: string } | null;
    labels?: string[];
    components?: Array<{ id: string; name: string }>;
    [key: string]: unknown;
  };
}

export interface JiraIssueInput {
  fields: {
    project: { key: string } | { id: string };
    summary: string;
    description?: string;
    issuetype: { id: string } | { name: string };
    priority?: { id: string } | { name: string };
    assignee?: { accountId: string } | { name: string } | null;
    duedate?: string;
    labels?: string[];
    components?: Array<{ id: string } | { name: string }>;
    [key: string]: unknown;
  };
}

export interface JiraSearchResult {
  expand: string;
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraIssue[];
}

export interface JiraTransition {
  id: string;
  name: string;
  to: JiraStatus;
}

export interface JiraResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

export class JiraClient {
  private baseUrl: string;
  private username: string;
  private apiToken: string;
  private isCloud: boolean;

  constructor(baseUrl: string, username: string, apiToken: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.username = username;
    this.apiToken = apiToken;
    // Detect if this is Jira Cloud (*.atlassian.net)
    this.isCloud = /\.atlassian\.net$/i.test(new URL(baseUrl).hostname);
  }

  private getHeaders(): Record<string, string> {
    const credentials = Buffer.from(`${this.username}:${this.apiToken}`).toString('base64');
    return {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private getApiVersion(): string {
    // Use API v3 for Cloud, v2 for Server
    return this.isCloud ? '3' : '2';
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: unknown
  ): Promise<JiraResponse<T>> {
    try {
      const url = `${this.baseUrl}/rest/api/${this.getApiVersion()}${endpoint}`;
      const options: RequestInit = {
        method,
        headers: this.getHeaders(),
      };

      if (body && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let errorMessage: string;
        if (errorData.errorMessages?.length) {
          errorMessage = errorData.errorMessages.join(', ');
        } else if (errorData.errors && Object.keys(errorData.errors).length > 0) {
          errorMessage = Object.entries(errorData.errors)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ');
        } else {
          errorMessage = `HTTP ${response.status}`;
        }
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
  async getCurrentUser(): Promise<JiraResponse<JiraUser>> {
    return this.request<JiraUser>('GET', '/myself');
  }

  /**
   * Get list of projects
   */
  async getProjects(
    options: {
      startAt?: number;
      maxResults?: number;
      orderBy?: string;
    } = {}
  ): Promise<JiraResponse<JiraProject[]>> {
    const params = new URLSearchParams();
    if (options.startAt !== undefined) params.set('startAt', String(options.startAt));
    if (options.maxResults !== undefined) params.set('maxResults', String(options.maxResults));
    if (options.orderBy) params.set('orderBy', options.orderBy);

    const queryString = params.toString();
    const endpoint = queryString ? `/project?${queryString}` : '/project';

    return this.request<JiraProject[]>('GET', endpoint);
  }

  /**
   * Get project by ID or key
   */
  async getProject(projectIdOrKey: string): Promise<JiraResponse<JiraProject>> {
    return this.request<JiraProject>('GET', `/project/${projectIdOrKey}`);
  }

  /**
   * Get issue types for a project
   */
  async getIssueTypes(projectIdOrKey: string): Promise<JiraResponse<JiraIssueType[]>> {
    const result = await this.request<{ issueTypes: JiraIssueType[] }>(
      'GET',
      `/project/${projectIdOrKey}`
    );
    if (!result.success) {
      return { success: false, error: result.error, status: result.status };
    }
    return { success: true, data: result.data?.issueTypes || [] };
  }

  /**
   * Get all issue types
   */
  async getAllIssueTypes(): Promise<JiraResponse<JiraIssueType[]>> {
    return this.request<JiraIssueType[]>('GET', '/issuetype');
  }

  /**
   * Get list of statuses
   */
  async getStatuses(): Promise<JiraResponse<JiraStatus[]>> {
    return this.request<JiraStatus[]>('GET', '/status');
  }

  /**
   * Get statuses for a project
   */
  async getProjectStatuses(projectIdOrKey: string): Promise<JiraResponse<JiraStatus[]>> {
    const result = await this.request<Array<{ statuses: JiraStatus[] }>>(
      'GET',
      `/project/${projectIdOrKey}/statuses`
    );
    if (!result.success) {
      return { success: false, error: result.error, status: result.status };
    }
    // Flatten statuses from all issue types
    const statuses: JiraStatus[] = [];
    const seenIds = new Set<string>();
    for (const issueType of result.data || []) {
      for (const status of issueType.statuses) {
        if (!seenIds.has(status.id)) {
          seenIds.add(status.id);
          statuses.push(status);
        }
      }
    }
    return { success: true, data: statuses };
  }

  /**
   * Get list of priorities
   */
  async getPriorities(): Promise<JiraResponse<JiraPriority[]>> {
    return this.request<JiraPriority[]>('GET', '/priority');
  }

  /**
   * Search issues using JQL
   */
  async searchIssues(
    jql: string,
    options: {
      startAt?: number;
      maxResults?: number;
      fields?: string[];
      expand?: string[];
    } = {}
  ): Promise<JiraResponse<JiraSearchResult>> {
    const body = {
      jql,
      startAt: options.startAt || 0,
      maxResults: options.maxResults || 50,
      fields: options.fields || [
        'summary',
        'description',
        'issuetype',
        'project',
        'status',
        'priority',
        'assignee',
        'reporter',
        'created',
        'updated',
        'duedate',
        'resolution',
        'labels',
        'components',
      ],
      expand: options.expand,
    };

    return this.request<JiraSearchResult>('POST', '/search', body);
  }

  /**
   * Get issues for a project
   */
  async getIssues(
    projectKey: string,
    options: {
      status?: string | string[];
      issueType?: string;
      assignee?: string;
      maxResults?: number;
      startAt?: number;
      orderBy?: string;
      updatedSince?: string;
    } = {}
  ): Promise<JiraResponse<JiraSearchResult>> {
    const jqlParts: string[] = [`project = "${projectKey}"`];

    if (options.status) {
      const statuses = Array.isArray(options.status) ? options.status : [options.status];
      jqlParts.push(`status IN (${statuses.map((s) => `"${s}"`).join(', ')})`);
    }
    if (options.issueType) {
      jqlParts.push(`issuetype = "${options.issueType}"`);
    }
    if (options.assignee) {
      jqlParts.push(`assignee = "${options.assignee}"`);
    }
    if (options.updatedSince) {
      jqlParts.push(`updated >= "${options.updatedSince}"`);
    }

    const jql = jqlParts.join(' AND ') + ` ORDER BY ${options.orderBy || 'updated DESC'}`;

    return this.searchIssues(jql, {
      startAt: options.startAt,
      maxResults: options.maxResults,
    });
  }

  /**
   * Get a single issue by ID or key
   */
  async getIssue(
    issueIdOrKey: string,
    options: {
      fields?: string[];
      expand?: string[];
    } = {}
  ): Promise<JiraResponse<JiraIssue>> {
    const params = new URLSearchParams();
    if (options.fields?.length) {
      params.set('fields', options.fields.join(','));
    }
    if (options.expand?.length) {
      params.set('expand', options.expand.join(','));
    }

    const queryString = params.toString();
    const endpoint = queryString
      ? `/issue/${issueIdOrKey}?${queryString}`
      : `/issue/${issueIdOrKey}`;

    return this.request<JiraIssue>('GET', endpoint);
  }

  /**
   * Create a new issue
   */
  async createIssue(issue: JiraIssueInput): Promise<JiraResponse<JiraIssue>> {
    const result = await this.request<{ id: string; key: string; self: string }>(
      'POST',
      '/issue',
      issue
    );

    if (!result.success) {
      return { success: false, error: result.error, status: result.status };
    }

    // Fetch the created issue to get full details
    return this.getIssue(result.data!.key);
  }

  /**
   * Update an existing issue
   */
  async updateIssue(
    issueIdOrKey: string,
    update: {
      fields?: Partial<JiraIssueInput['fields']>;
      update?: Record<string, Array<{ add?: unknown; remove?: unknown; set?: unknown }>>;
    }
  ): Promise<JiraResponse<JiraIssue>> {
    const result = await this.request<void>('PUT', `/issue/${issueIdOrKey}`, update);

    if (!result.success) {
      return { success: false, error: result.error, status: result.status };
    }

    // Fetch the updated issue
    return this.getIssue(issueIdOrKey);
  }

  /**
   * Delete an issue
   */
  async deleteIssue(issueIdOrKey: string): Promise<JiraResponse<void>> {
    return this.request<void>('DELETE', `/issue/${issueIdOrKey}`);
  }

  /**
   * Get available transitions for an issue
   */
  async getTransitions(
    issueIdOrKey: string
  ): Promise<JiraResponse<{ transitions: JiraTransition[] }>> {
    return this.request<{ transitions: JiraTransition[] }>(
      'GET',
      `/issue/${issueIdOrKey}/transitions`
    );
  }

  /**
   * Transition an issue to a new status
   */
  async transitionIssue(
    issueIdOrKey: string,
    transitionId: string,
    options?: {
      fields?: Record<string, unknown>;
      update?: Record<string, Array<{ add?: unknown }>>;
      comment?: string;
    }
  ): Promise<JiraResponse<void>> {
    const body: Record<string, unknown> = {
      transition: { id: transitionId },
    };

    if (options?.fields) {
      body.fields = options.fields;
    }
    if (options?.update) {
      body.update = options.update;
    }
    if (options?.comment) {
      body.update = {
        ...((body.update as Record<string, unknown>) || {}),
        comment: [{ add: { body: options.comment } }],
      };
    }

    return this.request<void>('POST', `/issue/${issueIdOrKey}/transitions`, body);
  }

  /**
   * Add a comment to an issue
   */
  async addComment(issueIdOrKey: string, comment: string): Promise<JiraResponse<unknown>> {
    return this.request<unknown>('POST', `/issue/${issueIdOrKey}/comment`, {
      body: comment,
    });
  }
}

/**
 * Create a JiraClient from an integration ID
 */
export async function createJiraClientFromIntegration(
  integrationId: bigint,
  integration: {
    baseUrl: string;
    username: string | null;
  }
): Promise<JiraClient | null> {
  const credentials = await getDecryptedCredentials(integrationId);

  if (!credentials?.apiKey || !integration.username) {
    return null;
  }

  return new JiraClient(integration.baseUrl, integration.username, credentials.apiKey);
}
