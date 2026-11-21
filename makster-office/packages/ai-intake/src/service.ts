import type { AiIntakeProvider, AiIntakeRequest, AiIntakeResult } from './types.js';
import { compileIntentToChangeSet } from './compiler.js';

export class AiIntakeService {
  constructor(private readonly provider: AiIntakeProvider) {}

  async analyze(request: AiIntakeRequest): Promise<AiIntakeResult> {
    const intent = await this.provider.extract(request);
    const changeSet = compileIntentToChangeSet(request.project, intent);
    return { intent, changeSet };
  }
}
