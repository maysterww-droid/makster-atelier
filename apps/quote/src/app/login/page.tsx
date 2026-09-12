import { LocaleSwitcher } from '@/components/locale-switcher';
import { getInterfaceLocale } from '@/lib/interface-locale';
import { getAuthMessages } from '@/lib/i18n-auth';
import { login, signup } from './actions';

export const dynamic='force-dynamic';
type Props={searchParams:Promise<{error?:string;message?:string}>};

export default async function LoginPage({searchParams}:Props){
  const query=await searchParams;const locale=await getInterfaceLocale();const m=getAuthMessages(locale);
  const errors:Record<string,string>={missing:m.missing,invalid:m.invalid,password:m.passwordError,signup:m.signupError};
  return <main className="authPage"><section className="authCard">
    <div className="authBrand"><span className="brandMark">M</span><div><strong>Makster</strong><small>Quote</small></div></div>
    <h1>{m.headline}</h1><p className="muted">{m.loginHelp}</p>
    <LocaleSwitcher locale={locale} label={m.interfaceLanguage}/>
    {query.error?<div className="notice error">{errors[query.error]??m.genericError}</div>:null}
    {query.message==='check-email'?<div className="notice success">{m.checkEmail}</div>:null}
    <form className="stackForm"><label>Email<input name="email" type="email" autoComplete="email" required/></label><label>{m.password}<input name="password" type="password" minLength={8} autoComplete="current-password" required/></label><button className="primary wide" formAction={login}>{m.login}</button><button className="secondary wide" formAction={signup}>{m.createAccount}</button></form>
    <p className="finePrint">{m.languageNote}</p>
  </section></main>;
}
