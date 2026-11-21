import { compileIntentToChangeSet } from './compiler.js';
export class AiIntakeService {
    provider;
    constructor(provider) {
        this.provider = provider;
    }
    async analyze(request) {
        const intent = await this.provider.extract(request);
        const changeSet = compileIntentToChangeSet(request.project, intent);
        return { intent, changeSet };
    }
}
