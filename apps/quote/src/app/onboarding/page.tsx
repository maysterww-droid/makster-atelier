import { redirect } from 'next/navigation';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { getInterfaceLocale } from '@/lib/interface-locale';
import { getAuthMessages } from '@/lib/i18n-auth';
import { findActiveMembership, requireUser } from '@/lib/workspace';
import { createWorkspace } from './actions';

export const dynamic='force-dynamic';
type Props={searchParams:Promise<{error?:string}>};
const countries=['CZ','DE','PL','AT','UA'];

export default async function OnboardingPage({searchParams}:Props){
  const query=await searchParams;const {supabase,userId}=await requireUser();const existing=await findActiveMembership(supabase,userId);if(existing)redirect('/dashboard');
  const locale=await getInterfaceLocale();const m=getAuthMessages(locale);
  return <main className="authPage"><section className="authCard wideCard">
    <div className="eyebrow">MAKSTER QUOTE · {m.firstRun}</div><h1>{m.createWorkspace}</h1><p className="muted">{m.workspaceHelp}</p><LocaleSwitcher locale={locale} label={m.interfaceLanguage}/>
    {query.error?<div className="notice error">{m.workspaceError}</div>:null}
    <form action={createWorkspace} className="stackForm"><label>{m.workspaceName}<input name="name" placeholder={m.workspacePlaceholder} maxLength={160} required/></label><div className="formGrid3"><label>{m.country}<select name="countryCode" defaultValue="CZ">{countries.map((code)=><option key={code} value={code}>{m.countries[code]}</option>)}</select></label><label>{m.currency}<select name="currency" defaultValue="CZK"><option>CZK</option><option>EUR</option><option>PLN</option><option>USD</option></select></label><label>{m.timezone}<select name="timezone" defaultValue="Europe/Prague"><option>Europe/Prague</option><option>Europe/Berlin</option><option>Europe/Warsaw</option><option>Europe/Kyiv</option></select></label></div><button className="primary wide" type="submit">{m.createWorkshop}</button></form>
  </section></main>;
}
