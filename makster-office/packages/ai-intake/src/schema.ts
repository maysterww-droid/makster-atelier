/** Strict Structured Output schema for the OpenAI Responses API. */
export const AI_PROJECT_INTENT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'intentVersion', 'summary', 'projectType', 'titleSuggestion', 'dimensionsMm',
    'moduleCount', 'modules', 'frontCount', 'mirroredFrontIndexes', 'materials',
    'notes', 'missingInformation', 'confidence',
  ],
  properties: {
    intentVersion: { const: '1.0.0' },
    summary: { type: 'string' },
    projectType: {
      anyOf: [
        { type: 'string', enum: ['wardrobe', 'walk_in', 'kitchen', 'cabinet', 'sideboard', 'built_in', 'mixed'] },
        { type: 'null' },
      ],
    },
    titleSuggestion: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    dimensionsMm: {
      type: 'object',
      additionalProperties: false,
      required: ['width', 'height', 'depth'],
      properties: {
        width: { anyOf: [{ type: 'number', minimum: 1 }, { type: 'null' }] },
        height: { anyOf: [{ type: 'number', minimum: 1 }, { type: 'null' }] },
        depth: { anyOf: [{ type: 'number', minimum: 1 }, { type: 'null' }] },
      },
    },
    moduleCount: { anyOf: [{ type: 'integer', minimum: 1, maximum: 30 }, { type: 'null' }] },
    modules: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['moduleIndex', 'kind', 'shelfCount', 'drawerCount', 'railCount'],
        properties: {
          moduleIndex: { type: 'integer', minimum: 1, maximum: 30 },
          kind: { type: 'string', enum: ['shelves', 'drawers', 'short_clothes', 'long_clothes', 'open'] },
          shelfCount: { anyOf: [{ type: 'integer', minimum: 0, maximum: 30 }, { type: 'null' }] },
          drawerCount: { anyOf: [{ type: 'integer', minimum: 0, maximum: 20 }, { type: 'null' }] },
          railCount: { anyOf: [{ type: 'integer', minimum: 0, maximum: 5 }, { type: 'null' }] },
        },
      },
    },
    frontCount: { anyOf: [{ type: 'integer', minimum: 0, maximum: 60 }, { type: 'null' }] },
    mirroredFrontIndexes: { type: 'array', items: { type: 'integer', minimum: 1, maximum: 60 } },
    materials: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['role', 'manufacturer', 'code', 'name'],
        properties: {
          role: { type: 'string', enum: ['carcass', 'front', 'edge', 'back', 'glass', 'profile', 'other'] },
          manufacturer: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          code: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          name: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        },
      },
    },
    notes: { type: 'array', items: { type: 'string' } },
    missingInformation: { type: 'array', items: { type: 'string' } },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
  },
} as const;
