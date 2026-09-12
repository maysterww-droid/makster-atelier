import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { getInterfaceLocale } from '@/lib/interface-locale';
import { getMessages } from '@/lib/i18n';
import { requireWorkspace } from '@/lib/workspace';
import { createProject } from './actions';

export const dynamic = 'force-dynamic';
type Props = { searchParams: Promise<{ error?: string }> };

export default async function NewProjectPage({ searchParams }: Props) {
  const query = await searchParams;
  const { supabase, organization, role } = await requireWorkspace();
  const locale = await getInterfaceLocale();
  const m = getMessages(locale);
  const { data: subscription } = await supabase.from('quote_subscriptions').select('plan').eq('organization_id', organization.id).maybeSingle();

  return (
    <AppShell organizationName={organization.name} role={role} plan={(subscription?.plan ?? 'free').toUpperCase()}>
      <header className="topbar"><div><span className="eyebrow">{m.newQuote.toUpperCase()}</span><h1>{m.createProject}</h1></div><Link href="/" className="textLink">{m.homeBack}</Link></header>
      <div className="pageContent narrow">
        {query.error ? <div className="notice error">{m.createProjectError}</div> : null}
        <section className="panel formPanel"><div className="panelHeader"><div><h2>{m.basicData}</h2><p className="muted">{m.furnitureDetailsNext}</p></div></div>
          <form action={createProject} className="stackForm padded">
            <label>{m.projectNameLabel}<input name="name" placeholder={m.projectNamePlaceholder} maxLength={200} required autoFocus /></label>
            <div className="formGrid2">
              <label>{m.furnitureType}<select name="projectType" defaultValue="kitchen"><option value="kitchen">{m.furnitureKitchen}</option><option value="wardrobe">{m.furnitureWardrobe}</option><option value="built_in">{m.furnitureBuiltIn}</option><option value="cabinet">{m.furnitureCabinet}</option><option value="sideboard">{m.furnitureSideboard}</option><option value="mixed">{m.furnitureMixed}</option></select></label>
              <label>{m.currency}<select name="currency" defaultValue={organization.currency}><option value="CZK">CZK</option><option value="EUR">EUR</option><option value="PLN">PLN</option><option value="USD">USD</option></select></label>
            </div>
            <div className="formActions"><Link href="/" className="secondary linkButton">{m.cancel}</Link><button type="submit" className="primary">{m.createAndOpen}</button></div>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
