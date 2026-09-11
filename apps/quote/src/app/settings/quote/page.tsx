import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { readQuoteBrand } from '@/lib/quote-brand';
import { requireWorkspace } from '@/lib/workspace';
import { saveQuoteBrand } from './actions';

export const dynamic = 'force-dynamic';
type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function QuoteSettingsPage({ searchParams }: Props) {
  const query = await searchParams;
  const { supabase, organization, role } = await requireWorkspace();
  const { data: subscription } = await supabase.from('quote_subscriptions').select('plan').eq('organization_id', organization.id).maybeSingle();
  const brand = readQuoteBrand(organization.settings, organization.name);
  const editable = ['owner', 'admin'].includes(role);

  return <AppShell organizationName={organization.name} role={role} plan={(subscription?.plan ?? 'free').toUpperCase()}>
    <header className="topbar"><div><span className="eyebrow">DOCUMENT SETTINGS · MQ 0.1.4</span><h1>Реквизиты и фирменный документ</h1></div><Link href="/" className="textLink">← Главная</Link></header>
    <div className="pageContent compact">
      {query.saved === '1' ? <div className="notice success"><strong>Реквизиты сохранены.</strong> Новые выпущенные предложения будут фиксировать эти данные в своём snapshot.</div> : null}
      {query.error ? <div className="notice error">Не удалось сохранить реквизиты ({query.error}).</div> : null}
      <section className="panel">
        <div className="panelHeader"><div><h2>Makster Quote — данные исполнителя</h2><p className="muted">Эти данные общие для мастерской. Уже выпущенные предложения не меняются при последующем редактировании.</p></div></div>
        <form action={saveQuoteBrand} className="stackForm padded">
          <div className="formGrid2"><label>Торговое имя<input name="tradeName" defaultValue={brand.tradeName} disabled={!editable}/></label><label>Юридическое имя<input name="legalName" defaultValue={brand.legalName} disabled={!editable}/></label></div>
          <div className="formGrid2"><label>IČO / регистрационный номер<input name="registrationId" defaultValue={brand.registrationId} disabled={!editable}/></label><label>DIČ / VAT ID<input name="vatId" defaultValue={brand.vatId} disabled={!editable}/></label></div>
          <label>Адрес<input name="address" defaultValue={brand.address} disabled={!editable} placeholder="Улица, город, индекс, страна"/></label>
          <div className="formGrid3"><label>Email<input name="email" type="email" defaultValue={brand.email} disabled={!editable}/></label><label>Телефон<input name="phone" defaultValue={brand.phone} disabled={!editable}/></label><label>Сайт<input name="website" defaultValue={brand.website} disabled={!editable}/></label></div>
          <div className="formGrid2"><label>Банковский счёт<input name="bankAccount" defaultValue={brand.bankAccount} disabled={!editable}/></label><label>IBAN<input name="iban" defaultValue={brand.iban} disabled={!editable}/></label></div>
          <label>Футер / дополнительный текст<textarea name="footerText" rows={4} defaultValue={brand.footerText} disabled={!editable} placeholder="Например: реквизиты компании, юридическая оговорка или контакты."/></label>
          {editable ? <div className="formActions"><button className="primary" type="submit">Сохранить реквизиты</button></div> : <div className="notice warning">Редактирование доступно владельцу или администратору мастерской.</div>}
        </form>
      </section>
    </div>
  </AppShell>;
}
