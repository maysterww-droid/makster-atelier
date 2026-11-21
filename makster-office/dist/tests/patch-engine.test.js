import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { applyProjectChangeSet, createEmptyProjectModel } from '../packages/project-model/src/index.js';
test('applies a safe change and increments revision', () => {
    const projectId = randomUUID();
    const project = createEmptyProjectModel({ projectId, title: 'Новый проект' });
    const next = applyProjectChangeSet(project, {
        changeId: randomUUID(), projectId, basedOnRevision: 1, source: 'ai',
        patches: [{ op: 'set', path: '/title', value: 'Шкаф' }],
    });
    assert.equal(next.title, 'Шкаф');
    assert.equal(next.revision, 2);
    assert.equal(project.revision, 1);
});
test('blocks protected metadata paths', () => {
    const projectId = randomUUID();
    const project = createEmptyProjectModel({ projectId, title: 'Новый проект' });
    assert.throws(() => applyProjectChangeSet(project, {
        changeId: randomUUID(), projectId, basedOnRevision: 1, source: 'ai',
        patches: [{ op: 'set', path: '/projectId', value: randomUUID() }],
    }), /protected/);
});
test('blocks stale revision', () => {
    const projectId = randomUUID();
    const project = createEmptyProjectModel({ projectId, title: 'Новый проект' });
    assert.throws(() => applyProjectChangeSet(project, {
        changeId: randomUUID(), projectId, basedOnRevision: 99, source: 'ai', patches: [],
    }), /revision_conflict/);
});
