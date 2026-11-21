import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { MaksterEngineeringCompiler } from '../../../packages/engineering-engine/src/index.js';
import { buildProductionPack } from '../../../packages/production-pack/src/index.js';
import { awardSupplierQuote, compareSupplierQuotes, createSupplierRfq } from '../../../packages/procurement-intelligence/src/index.js';
const out = process.argv[2] ?? 'engineering-output/procurement-demo';
await mkdir(out, { recursive: true });
const project = JSON.parse(await readFile('packages/project-model/examples/wardrobe.blum.v1.json', 'utf8'));
const engineering = new MaksterEngineeringCompiler().compile(project);
const pack = buildProductionPack({ project, engineering, route: 'outsource', outsourcePreset: 'cutting_edging', packId: 'procurement-demo-pack', generatedAt: '2026-09-03T12:00:00Z' });
const suppliers = [
    { id: 'supplier-prague-cut', name: 'Prague Cut Service', active: true, currencies: ['EUR', 'CZK'], services: ['cutting', 'edging'], deliveryModes: ['pickup', 'supplier_delivery'], minimumOrder: 100, typicalLeadDays: 5 },
    { id: 'supplier-quick-panel', name: 'QuickPanel', active: true, currencies: ['EUR'], services: ['cutting', 'edging', 'drilling'], deliveryModes: ['supplier_delivery'], minimumOrder: 120, typicalLeadDays: 2 },
    { id: 'supplier-budget-board', name: 'Budget Board', active: true, currencies: ['EUR'], services: ['cutting', 'edging'], deliveryModes: ['pickup'], minimumOrder: 80, typicalLeadDays: 7 },
];
const rfq = createSupplierRfq({ pack, suppliers, currency: 'EUR', rfqId: 'rfq-demo-001', requestedAt: '2026-09-03T12:05:00Z' });
const quotes = [
    { procurementVersion: '1.2.0', quoteId: 'quote-prague', rfqId: rfq.rfqId, supplierId: 'supplier-prague-cut', status: 'submitted', currency: 'EUR', basePrice: 410, deliveryPrice: 18, totalPrice: 428, leadDays: 5, services: ['cutting', 'edging'], deliveryMode: 'supplier_delivery', submittedAt: '2026-09-03T13:00:00Z' },
    { procurementVersion: '1.2.0', quoteId: 'quote-quick', rfqId: rfq.rfqId, supplierId: 'supplier-quick-panel', status: 'submitted', currency: 'EUR', basePrice: 445, deliveryPrice: 20, totalPrice: 465, leadDays: 2, services: ['cutting', 'edging'], deliveryMode: 'supplier_delivery', submittedAt: '2026-09-03T13:10:00Z' },
    { procurementVersion: '1.2.0', quoteId: 'quote-budget', rfqId: rfq.rfqId, supplierId: 'supplier-budget-board', status: 'submitted', currency: 'EUR', basePrice: 397, deliveryPrice: 0, totalPrice: 397, leadDays: 7, services: ['cutting', 'edging'], deliveryMode: 'pickup', submittedAt: '2026-09-03T13:20:00Z' },
];
const performance = [
    { supplierId: 'supplier-prague-cut', completedOrders: 12, onTimeOrders: 11, receivedUnits: 800, problemUnits: 8, reworkOrders: 1, onTimeRate: .92, problemRate: .01, reworkRate: .08, qualityScore: 96 },
    { supplierId: 'supplier-quick-panel', completedOrders: 8, onTimeOrders: 7, receivedUnits: 520, problemUnits: 18, reworkOrders: 2, onTimeRate: .88, problemRate: .03, reworkRate: .25, qualityScore: 91 },
    { supplierId: 'supplier-budget-board', completedOrders: 14, onTimeOrders: 9, receivedUnits: 1000, problemUnits: 45, reworkOrders: 5, onTimeRate: .64, problemRate: .05, reworkRate: .36, qualityScore: 82 },
];
const balanced = compareSupplierQuotes({ rfq, quotes, suppliers, performance, strategy: 'balanced', comparisonId: 'comparison-balanced', generatedAt: '2026-09-03T14:00:00Z' });
const cheapest = compareSupplierQuotes({ rfq, quotes, suppliers, performance, strategy: 'cheapest', comparisonId: 'comparison-cheapest', generatedAt: '2026-09-03T14:00:00Z' });
const fastest = compareSupplierQuotes({ rfq, quotes, suppliers, performance, strategy: 'fastest', comparisonId: 'comparison-fastest', generatedAt: '2026-09-03T14:00:00Z' });
const quality = compareSupplierQuotes({ rfq, quotes, suppliers, performance, strategy: 'quality_first', comparisonId: 'comparison-quality', generatedAt: '2026-09-03T14:00:00Z' });
const winner = quotes.find(q => q.quoteId === balanced.recommendedQuoteId);
const supplier = suppliers.find(s => s.id === winner.supplierId);
const order = awardSupplierQuote({ pack, rfq, quote: winner, supplier, orderId: 'supplier-order-from-rfq', createdAt: '2026-09-03T14:05:00Z' });
await Promise.all([
    writeFile(join(out, '01-rfq.json'), JSON.stringify(rfq, null, 2)),
    writeFile(join(out, '02-quotes.json'), JSON.stringify(quotes, null, 2)),
    writeFile(join(out, '03-performance.json'), JSON.stringify(performance, null, 2)),
    writeFile(join(out, '04-comparison-balanced.json'), JSON.stringify(balanced, null, 2)),
    writeFile(join(out, '05-comparison-cheapest.json'), JSON.stringify(cheapest, null, 2)),
    writeFile(join(out, '06-comparison-fastest.json'), JSON.stringify(fastest, null, 2)),
    writeFile(join(out, '07-comparison-quality.json'), JSON.stringify(quality, null, 2)),
    writeFile(join(out, '08-awarded-supplier-order.json'), JSON.stringify(order, null, 2)),
]);
const header = 'rank,supplier,total_price,lead_days,quality_score,total_score,eligible,warnings\n';
const rows = balanced.ranking.map((r, i) => [i + 1, r.supplierName, r.facts.totalPrice, r.facts.leadDays, r.facts.qualityScore, r.totalScore, r.eligible, `"${r.warnings.join(';')}"`].join(',')).join('\n');
await writeFile(join(out, 'comparison-balanced.csv'), header + rows + '\n');
console.log(JSON.stringify({ rfqId: rfq.rfqId, invited: rfq.invitedSupplierIds.length, balancedWinner: balanced.ranking[0], cheapestWinner: cheapest.ranking[0]?.supplierName, fastestWinner: fastest.ranking[0]?.supplierName, qualityWinner: quality.ranking[0]?.supplierName, orderId: order.orderId }, null, 2));
