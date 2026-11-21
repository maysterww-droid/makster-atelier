import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { MaksterEngineeringCompiler } from '../../../packages/engineering-engine/src/index.js';
import { buildProductionPack } from '../../../packages/production-pack/src/index.js';
import { buildCommercialPackage, formatMoney } from '../../../packages/commercial-engine/src/index.js';
const out = resolve(process.argv[2] ?? 'engineering-output/commercial-demo');
await mkdir(out, { recursive: true });
const project = JSON.parse(await readFile(resolve('packages/project-model/examples/wardrobe.blum.v1.json'), 'utf8'));
const engineering = new MaksterEngineeringCompiler().compile(project);
const productionPack = buildProductionPack({ project, engineering, route: 'manual_workshop', packId: 'commercial-demo-production-pack', generatedAt: '2026-09-04T16:00:00Z' });
const pricing = {
    profileId: 'TEST_ONLY_atelier_demo_eur_v1', name: 'TEST ONLY Atelier demo pricing — not a live price list', currency: 'EUR',
    materialPrices: [
        { materialSelectionId: '44444444-4444-4444-8444-444444444441', label: 'Light oak board 18 mm', pricingMode: 'per_sheet', thicknessMm: 18, unitCostMinor: 9200, sheetLengthMm: 2800, sheetWidthMm: 2070, wasteBps: 1200 },
        { materialSelectionId: '44444444-4444-4444-8444-444444444441', label: 'Light oak board 16 mm', pricingMode: 'per_sheet', thicknessMm: 16, unitCostMinor: 8200, sheetLengthMm: 2800, sheetWidthMm: 2070, wasteBps: 1200 },
        { materialSelectionId: '44444444-4444-4444-8444-444444444441', label: 'Light oak board 8 mm', pricingMode: 'per_sheet', thicknessMm: 8, unitCostMinor: 4500, sheetLengthMm: 2800, sheetWidthMm: 2070, wasteBps: 1200 },
        { materialSelectionId: '44444444-4444-4444-8444-444444444442', label: 'Graphite front', pricingMode: 'per_m2', thicknessMm: 18, unitCostMinor: 11500 },
        { materialSelectionId: '44444444-4444-4444-8444-444444444443', label: 'HDF back panel', pricingMode: 'per_m2', thicknessMm: 8, unitCostMinor: 1700 },
    ],
    edgePrices: [{ materialSelectionId: '44444444-4444-4444-8444-444444444444', unitCostPerMeterMinor: 75 }],
    hardwarePrices: [
        { role: 'rail', unitCostMinor: 2400 }, { hardwareSelectionId: '88888888-8888-4888-8888-888888888881', unitCostMinor: 680 }, { hardwareSelectionId: '88888888-8888-4888-8888-888888888882', unitCostMinor: 6200 }, { hardwareSelectionId: '88888888-8888-4888-8888-888888888883', unitCostMinor: 8900 },
    ],
    labor: [{ id: 'workshop', label: 'Workshop fabrication and assembly', minutes: 28 * 60, hourlyCostMinor: 2600 }, { id: 'installation', label: 'On-site installation', minutes: 10 * 60, hourlyCostMinor: 2900, category: 'installation' }],
    fixedCosts: [{ id: 'transport', label: 'Transport and handling', category: 'transport', costMinor: 12000 }],
    overheadBps: 800, markupBps: 3500, discountBps: 0, taxBps: 2100, commercialRoundingMinor: 1000,
};
const built = buildCommercialPackage({ project, engineering, productionPack, pricing, estimateId: 'commercial-demo-estimate', quoteId: 'commercial-demo-quote', packageId: 'commercial-demo-package', generatedAt: '2026-09-04T16:00:00Z', quoteTerms: { clientName: 'Demo Client', offerTitle: 'Custom wardrobe', validityDays: 14, leadTimeText: '30–45 days after final approval and deposit', paymentTerms: [{ label: 'Deposit', bps: 5000 }, { label: 'Before installation', bps: 4000 }, { label: 'After handover', bps: 1000 }], inclusions: ['Furniture manufacturing according to approved project revision', 'Hardware listed in the specification', 'Transport and installation'], exclusions: ['Electrical work', 'Wall repair and painting', 'Changes after approved revision'], notes: ['All values in this demo use TEST ONLY pricing and must be replaced by the organization price catalog before a real client quote.'], sellerName: 'Makster Atelier' } });
for (const [name, content] of Object.entries(built.files))
    await writeFile(resolve(out, name), content, 'utf8');
await writeFile(resolve(out, 'pricing-profile.TEST_ONLY.json'), JSON.stringify(pricing, null, 2) + '\n', 'utf8');
await writeFile(resolve(out, 'commercial-summary.txt'), [
    'MAKSTER 1.6 COMMERCIAL DEMO — TEST ONLY PRICES',
    `Project: ${project.title} · Revision ${project.revision}`,
    `Estimate ready: ${built.estimate.ready}`,
    `Full cost: ${formatMoney(built.estimate.totals.totalCostMinor, 'EUR')}`,
    `Net client price: ${formatMoney(built.estimate.totals.netSalesMinor, 'EUR')}`,
    `Configured tax: ${formatMoney(built.estimate.totals.taxMinor, 'EUR')}`,
    `Gross client price: ${formatMoney(built.estimate.totals.grossSalesMinor, 'EUR')}`,
    `Profit: ${formatMoney(built.estimate.totals.profitMinor, 'EUR')}`,
    `Margin: ${(built.estimate.totals.marginBps / 100).toFixed(2)}%`,
    `Estimate fingerprint: ${built.estimate.estimateFingerprint}`,
    `Quote fingerprint: ${built.quote.quoteFingerprint}`,
].join('\n') + '\n', 'utf8');
console.log(JSON.stringify({ out, ready: built.estimate.ready, totalCostMinor: built.estimate.totals.totalCostMinor, netSalesMinor: built.estimate.totals.netSalesMinor, grossSalesMinor: built.estimate.totals.grossSalesMinor, profitMinor: built.estimate.totals.profitMinor, marginBps: built.estimate.totals.marginBps }, null, 2));
