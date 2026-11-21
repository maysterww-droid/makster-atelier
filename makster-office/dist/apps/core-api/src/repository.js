import { randomUUID } from 'node:crypto';
import { createEmptyProjectModel, } from '../../../packages/project-model/src/index.js';
export class MemoryProjectRepository {
    projects = new Map();
    revisions = new Map();
    async createProject(input) {
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
        const record = {
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
    async listProjects(organizationId) {
        return [...this.projects.values()]
            .filter((project) => project.organizationId === organizationId)
            .map((project) => structuredClone(project));
    }
    async getProject(projectId) {
        const value = this.projects.get(projectId);
        return value ? structuredClone(value) : null;
    }
    async getProjectPrivileged(projectId) {
        return this.getProject(projectId);
    }
    async getRevision(projectId, revisionNumber) {
        const value = [...this.revisions.values()].find((revision) => revision.projectId === projectId && revision.revisionNumber === revisionNumber);
        return value ? structuredClone(value) : null;
    }
    async createRevision(input) {
        const project = this.projects.get(input.projectId);
        if (!project || project.organizationId !== input.organizationId)
            throw new Error('project_not_found');
        if (project.currentRevisionId !== input.parentRevisionId)
            throw new Error('revision_conflict');
        const id = randomUUID();
        this.revisions.set(id, { id, projectId: input.projectId, revisionNumber: input.snapshot.revision, parentRevisionId: input.parentRevisionId, snapshot: structuredClone(input.snapshot) });
        project.currentRevisionId = id;
        project.snapshot = structuredClone(input.snapshot);
        project.name = input.snapshot.title;
        project.projectType = input.snapshot.projectType;
        this.projects.set(project.id, project);
        return structuredClone(project);
    }
    async createRevisionPrivileged(input) {
        return this.createRevision(input);
    }
}
