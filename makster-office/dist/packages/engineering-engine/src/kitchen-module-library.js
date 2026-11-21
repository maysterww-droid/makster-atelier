const def = (id, label, type, fn, moduleKind, hasTop, hasBottom, hasBack, tags = []) => ({ id, label, type, function: fn, moduleKind, defaults: { hasTop, hasBottom, hasBack }, tags: ['kitchen-library', id, ...tags] });
export const KITCHEN_MODULE_LIBRARY = Object.freeze({
    'base.storage': def('base.storage', 'Base storage cabinet', 'base', 'storage', 'custom', true, true, true),
    'base.drawers': def('base.drawers', 'Base drawer cabinet', 'base', 'drawers', 'drawers', true, true, true),
    'base.sink': def('base.sink', 'Sink base cabinet', 'base', 'sink', 'sink', false, true, false),
    'base.oven_hob': def('base.oven_hob', 'Base oven + hob cabinet', 'base', 'oven', 'appliance', true, true, true),
    'base.dishwasher': def('base.dishwasher', 'Dishwasher reservation', 'base', 'dishwasher', 'appliance', false, false, false),
    'base.open': def('base.open', 'Open base section', 'base', 'open', 'open', true, true, true),
    'wall.storage': def('wall.storage', 'Wall storage cabinet', 'wall', 'storage', 'custom', true, true, true),
    'wall.hood': def('wall.hood', 'Wall hood cabinet', 'wall', 'hood', 'appliance', true, true, true),
    'wall.open': def('wall.open', 'Open wall section', 'wall', 'open', 'open', true, true, true),
    'tall.pantry': def('tall.pantry', 'Tall pantry', 'tall', 'pantry', 'custom', true, true, true),
    'tall.oven': def('tall.oven', 'Tall oven housing', 'tall', 'oven', 'appliance', true, true, true),
    'tall.fridge': def('tall.fridge', 'Tall fridge housing', 'tall', 'fridge', 'appliance', true, true, true),
    'tall.open': def('tall.open', 'Open tall section', 'tall', 'open', 'open', true, true, true),
    'technical.base': def('technical.base', 'Technical base section', 'base', 'storage', 'custom', true, true, true, ['technical']),
    'technical.wall': def('technical.wall', 'Technical wall section', 'wall', 'storage', 'custom', true, true, true, ['technical']),
    'technical.tall': def('technical.tall', 'Technical tall section', 'tall', 'storage', 'custom', true, true, true, ['technical']),
    'corner.base.blind': def('corner.base.blind', 'Blind corner base', 'base', 'storage', 'custom', true, true, true, ['corner', 'blind']),
    'corner.base.carousel': def('corner.base.carousel', 'Carousel corner base', 'base', 'storage', 'custom', true, true, true, ['corner', 'carousel']),
    'corner.base.lemans': def('corner.base.lemans', 'LeMans corner base', 'base', 'storage', 'custom', true, true, true, ['corner', 'lemans']),
    'corner.base.diagonal': def('corner.base.diagonal', 'Diagonal corner base', 'base', 'storage', 'custom', true, true, true, ['corner', 'diagonal']),
});
export function resolveKitchenLibraryModule(module) {
    if (!module.libraryModuleId)
        return module;
    const d = KITCHEN_MODULE_LIBRARY[module.libraryModuleId];
    if (!d)
        return module;
    const k = module.kitchen;
    return {
        ...module,
        kind: module.kind ?? d.moduleKind,
        tags: [...new Set([...(module.tags ?? []), ...d.tags])],
        kitchen: {
            type: k?.type ?? d.type,
            function: k?.function ?? d.function,
            hasTop: k?.hasTop ?? d.defaults.hasTop,
            hasBottom: k?.hasBottom ?? d.defaults.hasBottom,
            hasBack: k?.hasBack ?? d.defaults.hasBack,
            ...(k ?? {}),
        },
    };
}
