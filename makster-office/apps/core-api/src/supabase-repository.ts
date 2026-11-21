import type {
  CreateProjectInput,
  CreateRevisionInput,
  ProjectRecord,
  ProjectRepository,
  RevisionRecord,
} from './repository.js';
import { randomUUID } from 'node:crypto';
import { createEmptyProjectModel, type ProjectModelV1 } from '../../../packages/project-model/src/index.js';

interface SupabaseRepositoryOptions {
  url: string;
  publishableKey: string;
  secretKey?: string;
}

export class SupabaseProjectRepository implements ProjectRepository {
  constructor(private readonly options: SupabaseRepositoryOptions) {}

  private headers(bearerToken?: string): HeadersInit {
    if (!bearerToken) throw new Error('missing_bearer_token');
    return {
      apikey: this.options.publishableKey,
      authorization: `Bearer ${bearerToken}`,
      'content-type': 'application/json',
    };
  }

  private async request<T>(path: string, init: RequestInit, bearerToken?: string): Promise<T> {
    const response = await fetch(`${this.options.url}/rest/v1/${path}`, {
      ...init,
      headers: { ...this.headers(bearerToken), ...(init.headers ?? {}) },
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`supabase_${response.status}: ${text}`);
    return text ? JSON.parse(text) as T : (undefined as T);
  }

  async createProject(input: CreateProjectInput, bearerToken?: string): Promise<ProjectRecord> {
    const projectId = randomUUID();
    const snapshot = createEmptyProjectModel({
      projectId,
      title: input.name,
      ...(input.projectType ? { projectType: input.projectType } : {}),
      ...(input.currency ? { currency: input.currency } : {}),
      ...(input.locale ? { locale: input.locale } : {}),
    });

    await this.request<unknown>('rpc/create_project_with_initial_revision', {
      method: 'POST',
      body: JSON.stringify({
        p_project_id: projectId,
        p_organization_id: input.organizationId,
        p_name: input.name,
        p_project_type: input.projectType ?? 'mixed',
        p_currency: input.currency ?? 'EUR',
        p_snapshot: snapshot,
      }),
    }, bearerToken);

    const project = await this.getProject(projectId, bearerToken);
    if (!project) throw new Error('project_not_found_after_atomic_create');
    return project;
  }

  async listProjects(organizationId: string, bearerToken?: string): Promise<ProjectRecord[]> {
    const path = `projects?organization_id=eq.${encodeURIComponent(organizationId)}&select=id,organization_id,name,project_type,status,currency,current_revision_id&order=updated_at.desc`;
    const rows = await this.request<Array<any>>(path, { method: 'GET' }, bearerToken);
    return Promise.all(rows.map((row) => this.hydrate(row, bearerToken)));
  }

  async getProject(projectId: string, bearerToken?: string): Promise<ProjectRecord | null> {
    const rows = await this.request<Array<any>>(
      `projects?id=eq.${encodeURIComponent(projectId)}&select=id,organization_id,name,project_type,status,currency,current_revision_id`,
      { method: 'GET' }, bearerToken,
    );
    return rows[0] ? this.hydrate(rows[0], bearerToken) : null;
  }

  async getProjectPrivileged(projectId: string): Promise<ProjectRecord | null> {
    if (!this.options.secretKey) throw new Error('supabase_secret_key_required_for_public_share');
    return this.getProject(projectId, this.options.secretKey);
  }

  async getRevision(projectId: string, revisionNumber: number, bearerToken?: string): Promise<RevisionRecord | null> {
    const rows = await this.request<Array<any>>(
      `project_revisions?project_id=eq.${encodeURIComponent(projectId)}&revision_number=eq.${revisionNumber}&select=id,project_id,revision_number,parent_revision_id,snapshot_json`,
      { method: 'GET' }, bearerToken,
    );
    const row = rows[0];
    return row ? {
      id: row.id,
      projectId: row.project_id,
      revisionNumber: row.revision_number,
      parentRevisionId: row.parent_revision_id,
      snapshot: row.snapshot_json,
    } : null;
  }

  async createRevision(input: CreateRevisionInput, bearerToken?: string): Promise<ProjectRecord> {
    await this.request<Array<any>>('project_revisions', {
      method: 'POST',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify({
        organization_id: input.organizationId,
        project_id: input.projectId,
        parent_revision_id: input.parentRevisionId,
        snapshot_json: input.snapshot,
        change_set_json: input.changeSet ?? [],
        source: input.source,
      }),
    }, bearerToken);
    const project = await this.getProject(input.projectId, bearerToken);
    if (!project) throw new Error('project_not_found_after_revision');
    return project;
  }

  async createRevisionPrivileged(input: CreateRevisionInput): Promise<ProjectRecord> {
    if (!this.options.secretKey) throw new Error('supabase_secret_key_required_for_public_share');
    return this.createRevision(input, this.options.secretKey);
  }

  private async hydrate(row: any, bearerToken?: string): Promise<ProjectRecord> {
    let snapshot: ProjectModelV1 | null = null;
    if (row.current_revision_id) {
      const revisions = await this.request<Array<any>>(
        `project_revisions?id=eq.${encodeURIComponent(row.current_revision_id)}&select=snapshot_json`,
        { method: 'GET' }, bearerToken,
      );
      snapshot = revisions[0]?.snapshot_json ?? null;
    }
    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      projectType: row.project_type,
      status: row.status,
      currency: row.currency,
      currentRevisionId: row.current_revision_id,
      snapshot,
    };
  }
}
