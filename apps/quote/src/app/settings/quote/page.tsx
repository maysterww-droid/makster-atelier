import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { getInterfaceLocale } from '@/lib/interface-locale';
import { getSettingsMessages } from '@/lib/i18n-settings';
import { readQuoteBrand } from '@/lib/quote-brand';
import { requireWorkspace } from '@/lib/workspace';
import { saveQuoteBrand } from './actions';

export const dynamic = 'force-dynamic';
type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function QuoteSettingsPage({ searchParams }: Props) {
  const query=await searchParams;
  const {supabase,organization,role}=await requireWorkspace();
  const locale=await getInterfaceLocale(); const m=getSettingsMessages(locale);
  const {data:subscription}=await supabase.from('quote_subscriptions').select('plan').eq('organization_id',organization.id).maybeSingle();
  const brand=readQuoteBrand(organization.settings,organization.name); const editable=['owner','admin'].includes(role);

  return <AppShell organizationName={organization.name} role={role} plan={(subscription?.plan??'free').toUpperCase()}>
    <header className="topbar"><div><span className="eyebrow">DOCUMENT SETTINGS · MQ 0.1.15</span><h1>{m.documentsTitle}</h1></div><Link href="/" className="textLink">{m.back}</Link></header>
    <div className="pageContent compact">
      {query.saved==='1'?<div className="notice success"><strong>{m.documentSaved}</strong> {m.documentSnapshotHelp}</div>:null}
      {query.error?<div className="notice error">{m.documentSaveError} ({query.error})</div>:null}
      <section className="panel"><div className="panelHeader"><div><h2>{m.supplierData}</h2><p className="muted">{m.supplierDataHelp}</p></div></div>
        <form action={saveQuoteBrand} className="stackForm padded">
          <div className="formGrid2"><label>{m.tradeName}<input name="tradeName" defaultValue={brand.tradeName} disabled={!editable}/></label><label>{m.legalName}<input name="legalName" defaultValue={brand.legalName} disabled={!editable}/></label></div>
          <div className="formGrid2"><label>{m.registrationId}<input name="registrationId" defaultValue={brand.registrationId} disabled={!editable}/></label><label>{m.vatId}<input name="vatId" defaultValue={brand.vatId} disabled={!editable}/></label></div>
          <label>{m.address}<input name="address" defaultValue={brand.address} disabled={!editable} placeholder={m.addressPlaceholder}/></label>
          <div className="formGrid3"><label>{m.email}<input name="email" type="email" defaultValue={brand.email} disabled={!editable}/></label><label>{m.phone}<input name="phone" defaultValue={brand.phone} disabled={!editable}/></label><label>{m.website}<input name="website" defaultValue={brand.website} disabled={!editable}/></label></div>
          <div className="formGrid2"><label>{m.bankAccount}<input name="bankAccount" defaultValue={brand.bankAccount} disabled={!editable}/></label><label>IBAN<input name="iban" defaultValue={brand.iban} disabled={!editable}/></label></div>
          <label>{m.footer}<textarea name="footerText" rows={4} defaultValue={brand.footerText} disabled={!editable} placeholder={m.footerPlaceholder}/></label>
          {editable?<div className="formActions"><button className="primary" type="submit">{m.saveDetails}</button></div>:<div className="notice warning">{m.documentPermission}</div>}
        </form>
      </section>
    </div>
  </AppShell>;
}
