import Link from 'next/link';
import type { ReactNode } from 'react';

type Props = {
  organizationName: string;
  role: string;
  plan?: string;
  children: ReactNode;
};

export function AppShell({ organizationName, role, plan = 'FREE', children }: Props) {
  return (
    <main className="shell">
      <aside className="sidebar">
        <Link href="/" className="brand linkReset">
          <span className="brandMark">M</span>
          <span><strong>Makster</strong><small>Quote</small></span>
        </Link>
        <div className="workspaceName"><span>Мастерская</span><strong>{organizationName}</strong></div>
        <nav>
          <Link className="navItem" href="/">Главная</Link>
          <Link className="navItem" href="/projects/new">Новый расчёт</Link>
          <Link className="navItem" href="/price-book">Прайс-лист</Link>
          <span className="navItem disabled">Библиотека модулей</span>
          <span className="navItem disabled">Фурнитура</span>
          <Link className="navItem" href="/settings/quote">Документы / реквизиты</Link>
        </nav>
        <div className="planCard"><span>Тариф</span><strong>{plan}</strong><small>{role}</small></div>
        <form action="/auth/signout" method="post"><button className="navItem signOut" type="submit">Выйти</button></form>
      </aside>
      <section className="workspace">{children}</section>
    </main>
  );
}
