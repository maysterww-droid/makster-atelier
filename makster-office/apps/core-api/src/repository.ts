import { randomUUID } from 'node:crypto';
import {
  createEmptyProjectModel,
  type ProjectChangeSet,
  type ProjectModelV1,
  type ProjectType,
} from '../../../packages/project-model/src/index.js';

export interface ProjectRecord {
  id: string;
  organizationId: string;
  name: string;
  projectType: ProjectType;
  status: string;
  currency: string;
  currentRevisionId: string | null;
  snapshot: ProjectModelV1 | null;
}

export interface CreateProjectInput {
  organizationId: string;
  name: string;
  projectType?: ProjectType;
  currency?: string;
  locale?: string;
}

export interface RevisionRecord {
  id: string;
  projectId: string;
  revisionNumber: number;
  parentRevisionId: string | null;
  snapshot: ProjectModelV1;
}

export interface CreateRevisionInput {
  organizationId: string;
  projectId: string;
  parentRevisionId: string | null;
  snapshot: ProjectModelV1;
  changeSet: ProjectChangeSet | null;
  source: 'manual' | 'ai' | 'client' | 'import' | 'engineering' | 'system';
}

export interface ProjectRepository {
  createProject(input: CreateProjectInput, bearerToken?: string): Promise<ProjectRecord>;
  listProjects(organizationId: string, bearerToken?: string): Promise<ProjectRecord[]>;
  getProject(projectId: string, bearerToken?: string): Promise<ProjectRecord | null>;
  getProjectPrivileged(projectId: string): Promise<ProjectRecord | null>;
  getRevision(projectId: string, revisionNumber: number, bearerToken?: string): Promise<RevisionRecord | null>;
  createRevision(input: CreateRevisionInput, bearerToken?: string): Promise<ProjectRecord>;
  createRevisionPrivileged(input: CreateRevisionInput): Promise<ProjectRecord>;
}

interface MemoryRevision extends RevisionRecord {}

export class MemoryProjectRepository implements ProjectRepository {
  private readonly projects = new Map<string, ProjectRecord>();
  private readonly revisions = new Map<string, MemoryRevision>();

  async createProject(input: CreateProjectInput): Promise<ProjectRecord> {
    const id = randomUUID();
    const snapshot = createEmptyProjectModel({
      projectId: id,
      title: input.name,
      ...(input.projectType ? { projectType: input.projectType } : {}),
      ...(input.currency ? { currency: input.currency } : {}),
      ...(input.locale ? { locale: input.locale } : {}),
    });
    const revisionId = randomUUID();
    this.revisions.set(revisionId, { id: revisionId, projectId: id, revisionNumber: snapshot.revision, parentRevisionId: null, snapshot });
    const record: ProjectRecord = {
      id,
      organizationId: input.organizationId,
      name: input.name,
      projectType: input.projectType ?? 'mixed',
      status: 'draft',
      currency: input.currency ?? 'EUR',
      currentRevisionId: revisionId,
      snapshot,
    };
    this.projects.set(id, record);
    return structuredClone(record);
  }

  async listProjects(organizationId: string): Promise<ProjectRecord[]> {
    return [...this.projects.values()]
      .filter((project) => project.organizationId === organizationId)
      .map((project) => structuredClone(project));
  }

  async getProject(projectId: string): Promise<ProjectRecord | null> {
    const value = this.projects.get(projectId);
    return value ? structuredClone(value) : null;
  }

  async getProjectPrivileged(projectId: string): Promise<ProjectRecord | null> {
    return this.getProject(projectId);
  }

  async getRevision(projectId: string, revisionNumber: number): Promise<RevisionRecord | null> {
    const value = [...this.revisions.values()].find((revision) => revision.projectId === projectId && revision.revisionNumber === revisionNumber);
    return value ? structuredClone(value) : null;
  }

  async createRevision(input: CreateRevisionInput): Promise<ProjectRecord> {
    const project = this.projects.get(input.projectId);
    if (!project || project.organizationId !== input.organizationId) throw new Error('project_not_found');
    if (project.currentRevisionId !== input.parentRevisionId) throw new Error('revision_conflict');
    const id = randomUUID();
    this.revisions.set(id, { id, projectId: input.projectId, revisionNumber: input.snapshot.revision, parentRevisionId: input.parentRevisionId, snapshot: structuredClone(input.snapshot) });
    project.currentRevisionId = id;
    project.snapshot = structuredClone(input.snapshot);
    project.name = input.snapshot.title;
    project.projectType = input.snapshot.projectType;
    this.projects.set(project.id, project);
    return structuredClone(project);
  }
  async createRevisionPrivileged(input: CreateRevisionInput): Promise<ProjectRecord> {
    return this.createRevision(input);
  }

}
