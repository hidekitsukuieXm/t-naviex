/**
 * Azure DevOps API Client
 * Handles communication with Azure DevOps REST API
 */

import { getDecryptedCredentials } from '@/repositories/external-integration-repository';

export interface AzureDevOpsUser {
  id: string;
  displayName: string;
  uniqueName: string;
  url?: string;
  imageUrl?: string;
}

export interface AzureDevOpsProject {
  id: string;
  name: string;
  description?: string;
  url: string;
  state: string;
  visibility: string;
}

export interface AzureDevOpsWorkItemType {
  name: string;
  description?: string;
  color?: string;
  icon?: { id: string; url: string };
  isDisabled: boolean;
}

export interface AzureDevOpsWorkItemState {
  name: string;
  color?: string;
  category: string;
}

export interface AzureDevOpsWorkItem {
  id: number;
  rev: number;
  url: string;
  fields: {
    'System.Title': string;
    'System.Description'?: string;
    'System.State': string;
    'System.WorkItemType': string;
    'System.AssignedTo'?: {
      displayName: string;
      uniqueName: string;
      id?: string;
    };
    'System.CreatedBy': {
      displayName: string;
      uniqueName: string;
      id?: string;
    };
    'System.CreatedDate': string;
    'System.ChangedDate': string;
    'Microsoft.VSTS.Common.Priority'?: number;
    'Microsoft.VSTS.Common.Severity'?: string;
    'Microsoft.VSTS.Scheduling.DueDate'?: string;
    'System.Tags'?: string;
    'System.AreaPath'?: string;
    'System.IterationPath'?: string;
    [key: string]: unknown;
  };
  _links?: {
    html?: { href: string };
    self?: { href: string };
  };
}

export interface AzureDevOpsWorkItemInput {
  op: 'add' | 'replace' | 'remove' | 'test';
  path: string;
  value?: unknown;
}

export interface AzureDevOpsQueryResult {
  queryType: string;
  queryResultType: string;
  asOf: string;
  workItems: Array<{ id: number; url: string }>;
}

export interface AzureDevOpsResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

export class AzureDevOpsClient {
  private organization: string;
  private baseUrl: string;
  private personalAccessToken: string;
  private apiVersion: string = '7.0';

  constructor(organizationUrl: string, personalAccessToken: string) {
    // Parse organization URL: https://dev.azure.com/{organization} or https://{organization}.visualstudio.com
    const urlParts = organizationUrl.replace(/\/$/, '').split('/');
    this.organization = urlParts[urlParts.length - 1];
    this.baseUrl = organizationUrl.replace(/\/$/, '');
    this.personalAccessToken = personalAccessToken;
  }

  private getHeaders(): Record<string, string> {
    const credentials = Buffer.from(`:${this.personalAccessToken}`).toString('base64');
    return {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    endpoint: string,
    body?: unknown,
    contentType?: string
  ): Promise<AzureDevOpsResponse<T>> {
    try {
      const separator = endpoint.includes('?') ? '&' : '?';
      const url = `${this.baseUrl}${endpoint}${separator}api-version=${this.apiVersion}`;

      const headers = this.getHeaders();
      if (contentType) {
        headers['Content-Type'] = contentType;
      }

      const options: RequestInit = {
        method,
        headers,
      };

      if (body && (method === 'POST' || method === 'PATCH')) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.message || errorData.errorMessage || `HTTP ${response.status}`;
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
   * Get list of projects
   */
  async getProjects(
    options: {
      top?: number;
      skip?: number;
    } = {}
  ): Promise<AzureDevOpsResponse<{ count: number; value: AzureDevOpsProject[] }>> {
    let endpoint = '/_apis/projects';
    const params: string[] = [];

    if (options.top !== undefined) params.push(`$top=${options.top}`);
    if (options.skip !== undefined) params.push(`$skip=${options.skip}`);

    if (params.length > 0) {
      endpoint += '?' + params.join('&');
    }

    return this.request('GET', endpoint);
  }

  /**
   * Get project by ID or name
   */
  async getProject(projectIdOrName: string): Promise<AzureDevOpsResponse<AzureDevOpsProject>> {
    return this.request('GET', `/_apis/projects/${encodeURIComponent(projectIdOrName)}`);
  }

  /**
   * Get work item types for a project
   */
  async getWorkItemTypes(
    project: string
  ): Promise<AzureDevOpsResponse<{ count: number; value: AzureDevOpsWorkItemType[] }>> {
    return this.request('GET', `/${encodeURIComponent(project)}/_apis/wit/workitemtypes`);
  }

  /**
   * Get work item states for a specific work item type
   */
  async getWorkItemStates(
    project: string,
    workItemType: string
  ): Promise<AzureDevOpsResponse<{ count: number; value: AzureDevOpsWorkItemState[] }>> {
    return this.request(
      'GET',
      `/${encodeURIComponent(project)}/_apis/wit/workitemtypes/${encodeURIComponent(workItemType)}/states`
    );
  }

  /**
   * Get a single work item by ID
   */
  async getWorkItem(
    id: number,
    options: {
      project?: string;
      expand?: 'all' | 'relations' | 'fields' | 'links' | 'none';
      fields?: string[];
    } = {}
  ): Promise<AzureDevOpsResponse<AzureDevOpsWorkItem>> {
    let endpoint = options.project
      ? `/${encodeURIComponent(options.project)}/_apis/wit/workitems/${id}`
      : `/_apis/wit/workitems/${id}`;

    const params: string[] = [];
    if (options.expand) params.push(`$expand=${options.expand}`);
    if (options.fields?.length) params.push(`fields=${options.fields.join(',')}`);

    if (params.length > 0) {
      endpoint += '?' + params.join('&');
    }

    return this.request('GET', endpoint);
  }

  /**
   * Get multiple work items by IDs
   */
  async getWorkItems(
    ids: number[],
    options: {
      project?: string;
      expand?: 'all' | 'relations' | 'fields' | 'links' | 'none';
      fields?: string[];
    } = {}
  ): Promise<AzureDevOpsResponse<{ count: number; value: AzureDevOpsWorkItem[] }>> {
    let endpoint = options.project
      ? `/${encodeURIComponent(options.project)}/_apis/wit/workitems`
      : `/_apis/wit/workitems`;

    const params: string[] = [`ids=${ids.join(',')}`];
    if (options.expand) params.push(`$expand=${options.expand}`);
    if (options.fields?.length) params.push(`fields=${options.fields.join(',')}`);

    endpoint += '?' + params.join('&');

    return this.request('GET', endpoint);
  }

  /**
   * Query work items using WIQL
   */
  async queryWorkItems(
    project: string,
    query: string
  ): Promise<AzureDevOpsResponse<AzureDevOpsQueryResult>> {
    return this.request('POST', `/${encodeURIComponent(project)}/_apis/wit/wiql`, {
      query,
    });
  }

  /**
   * Get work items for a project
   */
  async getProjectWorkItems(
    project: string,
    options: {
      workItemType?: string;
      state?: string | string[];
      assignedTo?: string;
      top?: number;
      areaPath?: string;
    } = {}
  ): Promise<AzureDevOpsResponse<AzureDevOpsWorkItem[]>> {
    const conditions: string[] = ['[System.TeamProject] = @project'];

    if (options.workItemType) {
      conditions.push(`[System.WorkItemType] = '${options.workItemType}'`);
    }
    if (options.state) {
      const states = Array.isArray(options.state) ? options.state : [options.state];
      conditions.push(`[System.State] IN (${states.map((s) => `'${s}'`).join(', ')})`);
    }
    if (options.assignedTo) {
      conditions.push(`[System.AssignedTo] = '${options.assignedTo}'`);
    }
    if (options.areaPath) {
      conditions.push(`[System.AreaPath] UNDER '${options.areaPath}'`);
    }

    const query = `SELECT [System.Id] FROM WorkItems WHERE ${conditions.join(' AND ')} ORDER BY [System.ChangedDate] DESC`;

    const queryResult = await this.queryWorkItems(project, query);
    if (!queryResult.success || !queryResult.data) {
      return { success: false, error: queryResult.error, status: queryResult.status };
    }

    const workItemIds = queryResult.data.workItems.slice(0, options.top || 50).map((wi) => wi.id);

    if (workItemIds.length === 0) {
      return { success: true, data: [] };
    }

    const workItemsResult = await this.getWorkItems(workItemIds, { project });
    if (!workItemsResult.success) {
      return { success: false, error: workItemsResult.error, status: workItemsResult.status };
    }

    return { success: true, data: workItemsResult.data?.value || [] };
  }

  /**
   * Create a new work item
   */
  async createWorkItem(
    project: string,
    workItemType: string,
    operations: AzureDevOpsWorkItemInput[]
  ): Promise<AzureDevOpsResponse<AzureDevOpsWorkItem>> {
    return this.request(
      'POST',
      `/${encodeURIComponent(project)}/_apis/wit/workitems/$${encodeURIComponent(workItemType)}`,
      operations,
      'application/json-patch+json'
    );
  }

  /**
   * Update an existing work item
   */
  async updateWorkItem(
    id: number,
    operations: AzureDevOpsWorkItemInput[],
    options: {
      project?: string;
    } = {}
  ): Promise<AzureDevOpsResponse<AzureDevOpsWorkItem>> {
    const endpoint = options.project
      ? `/${encodeURIComponent(options.project)}/_apis/wit/workitems/${id}`
      : `/_apis/wit/workitems/${id}`;

    return this.request('PATCH', endpoint, operations, 'application/json-patch+json');
  }

  /**
   * Delete a work item
   */
  async deleteWorkItem(
    id: number,
    options: {
      project?: string;
      destroy?: boolean;
    } = {}
  ): Promise<AzureDevOpsResponse<void>> {
    let endpoint = options.project
      ? `/${encodeURIComponent(options.project)}/_apis/wit/workitems/${id}`
      : `/_apis/wit/workitems/${id}`;

    if (options.destroy) {
      endpoint += '?destroy=true';
    }

    return this.request('DELETE', endpoint);
  }

  /**
   * Add a comment to a work item
   */
  async addComment(
    project: string,
    workItemId: number,
    text: string
  ): Promise<AzureDevOpsResponse<unknown>> {
    return this.request(
      'POST',
      `/${encodeURIComponent(project)}/_apis/wit/workitems/${workItemId}/comments`,
      { text }
    );
  }
}

/**
 * Create an AzureDevOpsClient from an integration ID
 */
export async function createAzureDevOpsClientFromIntegration(
  integrationId: bigint,
  integration: {
    baseUrl: string;
  }
): Promise<AzureDevOpsClient | null> {
  const credentials = await getDecryptedCredentials(integrationId);

  if (!credentials?.apiKey) {
    return null;
  }

  return new AzureDevOpsClient(integration.baseUrl, credentials.apiKey);
}
