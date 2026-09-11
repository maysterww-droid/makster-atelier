import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { calculateQuote, formatMinor } from '@/lib/calculation';
import { requireWorkspace } from '@/lib/workspace';
import { savePricingSettings } from './actions';

export const dynamic = 'force-dynamic';
type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function integer(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed < 10_000 ? parsed : fallback;
}

const errorText: Record<string,string> = {
  permission:'Недостаточно прав.', margin:'Неверная целевая маржа.', 'minimum-margin':'Неверная минимальная маржа.',
  'minimum-above-target':'Минимальная маржа не может быть выше целевой.', overhead:'Неверные накладные расходы.', save:'Не удалось сохранить настройки.',
};

export default async function PricingSettingsPage({ searchParams }: Props) {
  const query = await searchParams;
  const { supabase, organization, role } = await requireWorkspace();
  const { data: subscription } = await supabase.from('quote_subscriptions').select('plan').eq('organization_id', organization.id).maybeSingle();
  const quote = record(record(organization.settings).quote);
  const targetMarginBps = integer(quote.targetMarginBps, 3500);
  const minimumMarginBps = Math.min(targetMarginBps, integer(quote.minimumMarginBps, 1500));
  const overheadBps = integer(quote.overheadBps, 0);
  const editable = ['owner', 'admin'].includes(role);

  const exampleDirect = 100_000n;
  const example = calculateQuote({
    costs: { board:exampleDirect, fronts:0n, edges:0n, hardware:0n, production:0n, labour:0n, delivery:0n, installation:0n, other:0n },
    overheadBps,
    targetMarginBps,
    taxBps: 0,
  });

  return <AppShell organizationName={organization.name} role={role} plan={(subscription?.plan ?? 'free').toUpperCase()}>
    <header className="topbar"><div><span className="eyebrow">PRICING ENGINE · MAKSTER QUOTE</span><h1>Маржа и накладные</h1></div><Link href="/" className="textLink">← Главная</Link></header>
    <div className="pageContent">
      {query.saved === '1' ? <div className="notice success"><strong>Параметры расчёта сохранены.</strong> Новые расчёты и новые версии предложений используют обновлённые значения.</div> : null}
      {query.error ? <div className="notice error">{errorText[query.error] ?? `Не удалось сохранить параметры (${query.error}).`}</div> : null}

      <section className="metricGrid">
        <article className="metricCard"><span>Целевая маржа</span><strong>{(targetMarginBps / 100).toFixed(2)}%</strong><small>обычная цель мастерской</small></article>
        <article className="metricCard"><span>Минимальная маржа</span><strong>{(minimumMarginBps / 100).toFixed(2)}%</strong><small>ниже этого выпуск предложения блокируется</small></article>
        <article className="metricCard"><span>Накладные</span><strong>{(overheadBps / 100).toFixed(2)}%</strong><small>добавляются к прямой себестоимости</small></article>
        <article className="metricCard"><span>Эквивалентная наценка</span><strong>{(example.markupBps / 100).toFixed(2)}%</strong><small>при целевой марже</small></article>
      </section>

      <div className="twoColumnPage">
        <section className="panel formPanel">
          <div className="panelHeader"><div><span className="eyebrow">НАСТРОЙКИ МАСТЕРСКОЙ</span><h2>Формула цены</h2><p className="muted">Применяется к рабочим расчётам всей мастерской. Уже выпущенные immutable-предложения не меняются.</p></div></div>
          <form action={savePricingSettings} className="stackForm padded">
            <label>Целевая маржа, %<input name="targetMarginPercent" type="number" min="0" max="99.99" step="0.01" defaultValue={(targetMarginBps / 100).toFixed(2)} disabled={!editable}/><small>Например, 35% означает: прибыль должна составлять 35% от цены без налога.</small></label>
            <label>Минимально допустимая маржа, %<input name="minimumMarginPercent" type="number" min="0" max="99.99" step="0.01" defaultValue={(minimumMarginBps / 100).toFixed(2)} disabled={!editable}/><small>Защита прибыли: скидка или низкий вариант не смогут выпустить предложение ниже этого порога.</small></label>
            <label>Накладные расходы, %<input name="overheadPercent" type="number" min="0" max="99.99" step="0.01" defaultValue={(overheadBps / 100).toFixed(2)} disabled={!editable}/><small>Процент от прямой себестоимости на аренду, администрацию, амортизацию и другие общие расходы.</small></label>
            {editable ? <button className="primary" type="submit">Сохранить параметры</button> : <div className="notice warning">Изменить параметры может владелец или администратор.</div>}
          </form>
        </section>

        <section className="panel">
          <div className="panelHeader"><div><span className="eyebrow">КОНТРОЛЬ ФОРМУЛЫ</span><h2>Как считается цена</h2><p className="muted">Пример для прямой себестоимости {formatMinor(exampleDirect, organization.currency)}.</p></div></div>
          <div className="costRows"><div><span>Прямая себестоимость</span><strong>{formatMinor(example.directCostMinor, organization.currency)}</strong></div><div><span>Накладные {(overheadBps / 100).toFixed(2)}%</span><strong>{formatMinor(example.overheadMinor, organization.currency)}</strong></div><div className="soft"><span>Полная себестоимость</span><strong>{formatMinor(example.trueCostMinor, organization.currency)}</strong></div></div>
          <div className="priceHero"><span>Цена при марже {(targetMarginBps / 100).toFixed(2)}%</span><strong>{formatMinor(example.netSalesMinor, organization.currency)}</strong><small>прибыль {formatMinor(example.profitMinor, organization.currency)} · наценка {(example.markupBps / 100).toFixed(2)}%</small></div>
          <div className="engineNote"><strong>Profit Guardrail</strong><span>Перед выпуском Makster пересчитывает фактическую маржу уже после скидки или надбавки. Если она ниже {(minimumMarginBps / 100).toFixed(2)}%, выпуск блокируется.</span></div>
          <div className="engineNote"><strong>Важно: маржа ≠ наценка</strong><span>Цена = Полная себестоимость / (1 − Маржа). Поэтому 35% маржи не равно 35% наценки.</span></div>
        </section>
      </div>
    </div>
  </AppShell>;
}
