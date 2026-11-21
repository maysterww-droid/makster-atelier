import type { AiIntakeProvider, AiIntakeRequest, AiProjectIntentV1 } from './types.js';

function parseDimensions(text: string): { width: number | null; height: number | null; depth: number | null } {
  const normalized = text.replace(/,/g, '.');
  const triple = normalized.match(/(\d{3,4})\s*[xх×*]\s*(\d{3,4})\s*[xх×*]\s*(\d{2,4})/i);
  if (triple) {
    return { width: Number(triple[1]), height: Number(triple[2]), depth: Number(triple[3]) };
  }

  const width = normalized.match(/(?:ширин\w*|width)\s*(?:[:=-]?\s*)?(\d{3,4})/i)?.[1];
  const height = normalized.match(/(?:высот\w*|height)\s*(?:[:=-]?\s*)?(\d{3,4})/i)?.[1];
  const depth = normalized.match(/(?:глубин\w*|depth)\s*(?:[:=-]?\s*)?(\d{2,4})/i)?.[1];
  return {
    width: width ? Number(width) : null,
    height: height ? Number(height) : null,
    depth: depth ? Number(depth) : null,
  };
}

function parseCount(text: string, patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return Number(match[1]);
  }
  return null;
}

export class DeterministicIntakeProvider implements AiIntakeProvider {
  async extract(request: AiIntakeRequest): Promise<AiProjectIntentV1> {
    const text = request.text;
    const lower = text.toLowerCase();
    const dimensionsMm = parseDimensions(text);
    const projectType = lower.includes('кух') ? 'kitchen'
      : lower.includes('гардероб') ? 'walk_in'
      : lower.includes('шкаф') ? 'wardrobe'
      : lower.includes('тумб') ? 'sideboard'
      : null;

    const moduleCount = parseCount(text, [/(\d+)\s*(?:секци|модул)/i]);
    const drawerCount = parseCount(text, [/(\d+)\s*(?:ящик)/i]);
    const shelfCount = parseCount(text, [/(\d+)\s*(?:полк)/i]);
    const frontCount = parseCount(text, [/(\d+)\s*(?:фасад|двер)/i]);

    const modules: AiProjectIntentV1['modules'] = [];
    if (moduleCount) {
      for (let i = 1; i <= moduleCount; i += 1) {
        modules.push({
          moduleIndex: i,
          kind: 'open' as const,
          shelfCount: null,
          drawerCount: null,
          railCount: null,
        });
      }
    }
    if (drawerCount && modules.length > 0) {
      const target = modules[modules.length - 1]!;
      target.kind = 'drawers';
      target.drawerCount = drawerCount;
    }
    if (shelfCount && modules.length > 0) {
      const target = modules[Math.floor(modules.length / 2)]!;
      target.kind = 'shelves';
      target.shelfCount = shelfCount;
    }

    const missingInformation: string[] = [];
    if (dimensionsMm.width === null) missingInformation.push('Укажите ширину мебели.');
    if (dimensionsMm.height === null) missingInformation.push('Укажите высоту мебели.');
    if (dimensionsMm.depth === null) missingInformation.push('Укажите глубину мебели.');
    if (moduleCount === null) missingInformation.push('Уточните количество секций/модулей.');

    return {
      intentVersion: '1.0.0',
      summary: `Распознано: ${projectType ?? 'мебель'}${moduleCount ? `, ${moduleCount} секций` : ''}.`,
      projectType,
      titleSuggestion: projectType === 'wardrobe' ? 'Новый шкаф' : null,
      dimensionsMm,
      moduleCount,
      modules,
      frontCount,
      mirroredFrontIndexes: lower.includes('зеркал') && frontCount && frontCount >= 2
        ? [Math.ceil(frontCount / 2), Math.ceil(frontCount / 2) + 1].filter((v) => v <= frontCount)
        : [],
      materials: [],
      notes: [],
      missingInformation,
      confidence: missingInformation.length === 0 ? 0.86 : 0.68,
    };
  }
}
