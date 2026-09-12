import Link from 'next/link';
import type { ReactNode } from 'react';
import { LocaleSwitcher } from './locale-switcher';
import { getInterfaceLocale } from '@/lib/interface-locale';
import { getMessages } from '@/lib/i18n';
import { MaksterQuoteLogo } from './brand-logo';

type Props = {
  organizationName: string;
  role: string;
  plan?: string;
  children: ReactNode;
};

export async function AppShell({ organizationName, role, plan = 'FREE', children }: Props) {
  const canManageSystem = role === 'owner' || role === 'admin';
  const locale = await getInterfaceLocale();
  const m = getMessages(locale);

  return (
    <main className="shell">
      <aside className="sidebar">
        <Link href="/dashboard" className="brand linkReset">
          <MaksterQuoteLogo variant="light" />
        </Link>
        <div className="workspaceName"><span>{m.workspace}</span><strong>{organizationName}</strong></div>
        <nav>
          <Link className="navItem" href="/dashboard">{m.dashboard}</Link>
          <Link className="navItem" href="/projects">{m.projects}</Link>
          <Link className="navItem" href="/projects/new">{m.newQuote}</Link>
          <Link className="navItem" href="/quotes">{m.quotes}</Link>
          <Link className="navItem" href="/analytics">{m.analytics}</Link>
          <Link className="navItem" href="/clients">{m.customers}</Link>
          <Link className="navItem" href="/price-book">{m.priceBook}</Link>
          <Link className="navItem" href="/library">{m.cabinetLibrary}</Link>
          <span className="navItem disabled">{m.hardware}</span>
          <Link className="navItem" href="/settings/pricing">{m.pricingSettings}</Link>
          <Link className="navItem" href="/settings/quote">{m.documentSettings}</Link>
          <Link className="navItem" href="/settings/billing">{m.billing}</Link>
          {canManageSystem ? <Link className="navItem" href="/settings/readiness">{m.readiness}</Link> : null}
        </nav>
        <LocaleSwitcher locale={locale} label={m.interfaceLanguage}/>
        <div className="planCard"><span>{m.plan}</span><strong>{plan}</strong><small>{role}</small></div>
        <form action="/auth/signout" method="post"><button className="navItem signOut" type="submit">{m.signOut}</button></form>
      </aside>
      <section className="workspace">{children}</section>
    </main>
  );
}
