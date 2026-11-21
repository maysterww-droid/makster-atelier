import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createEmptyProjectModel, applyProjectChangeSet, toMm } from '../packages/project-model/src/index.js';
import { AiIntakeService, DeterministicIntakeProvider } from '../packages/ai-intake/src/index.js';
test('Russian wardrobe request becomes a valid ProjectChangeSet', async () => {
    const project = createEmptyProjectModel({ projectId: randomUUID(), title: 'Новый проект' });
    const service = new AiIntakeService(new DeterministicIntakeProvider());
    const result = await service.analyze({
        project,
        text: 'Шкаф 3360x2650x600, 6 секций, справа 3 ящика',
    });
    const next = applyProjectChangeSet(project, result.changeSet);
    assert.equal(next.projectType, 'wardrobe');
    assert.equal(next.furniture.length, 1);
    assert.equal(toMm(next.furniture[0].dimensions.width.value), 3360);
    assert.equal(next.furniture[0].modules.length, 6);
    const lastContents = next.furniture[0].modules[5].contents;
    assert.equal(lastContents[0]?.kind, 'drawer_stack');
    if (lastContents[0]?.kind === 'drawer_stack')
        assert.equal(lastContents[0].count, 3);
});
