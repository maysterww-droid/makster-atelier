import { AI_PROJECT_INTENT_SCHEMA } from './schema.js';
function extractOutputText(response) {
    for (const item of response.output ?? []) {
        if (item.type !== 'message')
            continue;
        for (const content of item.content ?? []) {
            if (content.type === 'refusal')
                throw new Error(content.refusal ?? 'OpenAI refusal');
            if (content.type === 'output_text' && content.text)
                return content.text;
        }
    }
    throw new Error('OpenAI response contained no output_text');
}
export class OpenAIResponsesIntakeProvider {
    apiKey;
    model;
    constructor(apiKey, model = 'gpt-5.6-luna') {
        this.apiKey = apiKey;
        this.model = model;
    }
    async extract(request) {
        const furniture = request.project.furniture[0];
        const projectContext = {
            title: request.project.title,
            projectType: request.project.projectType,
            revision: request.project.revision,
            furniture: furniture ? {
                kind: furniture.kind,
                dimensionsMm: {
                    width: furniture.dimensions.width.value === null ? null : Number(furniture.dimensions.width.value) / 10,
                    height: furniture.dimensions.height.value === null ? null : Number(furniture.dimensions.height.value) / 10,
                    depth: furniture.dimensions.depth.value === null ? null : Number(furniture.dimensions.depth.value) / 10,
                },
                modules: furniture.modules.map((module, index) => ({ index: index + 1, kind: module.kind })),
            } : null,
        };
        const inputContent = [
            { type: 'input_text', text: `CURRENT_PROJECT_CONTEXT\n${JSON.stringify(projectContext)}\n\nUSER_REQUEST\n${request.text}` },
            ...(request.imageUrls ?? []).map((imageUrl) => ({ type: 'input_image', image_url: imageUrl })),
        ];
        const response = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
                authorization: `Bearer ${this.apiKey}`,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                model: this.model,
                store: false,
                reasoning: { effort: 'low' },
                instructions: [
                    'You are Makster Intake Agent for custom furniture.',
                    'Extract only facts stated or clearly visible. Do not invent production dimensions.',
                    'Return null for unknown scalar values and list critical missing information.',
                    'All dimensions in dimensionsMm are millimetres.',
                    'Module indexes are 1-based.',
                ].join(' '),
                input: [{ role: 'user', content: inputContent }],
                text: {
                    format: {
                        type: 'json_schema',
                        name: 'makster_project_intent_v1',
                        strict: true,
                        schema: AI_PROJECT_INTENT_SCHEMA,
                    },
                },
            }),
        });
        const payload = await response.json();
        if (!response.ok)
            throw new Error(payload.error?.message ?? `OpenAI HTTP ${response.status}`);
        return JSON.parse(extractOutputText(payload));
    }
}
