import { redirect } from 'next/navigation';
import { createWorkspace } from './actions';
import { requireUser, findActiveMembership } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<{ error?: string }> };

export default async function OnboardingPage({ searchParams }: Props) {
  const query = await searchParams;
  const { supabase, userId } = await requireUser();
  const existing = await findActiveMembership(supabase, userId);
  if (existing) redirect('/');

  return (
    <main className="authPage">
      <section className="authCard wideCard">
        <div className="eyebrow">MAKSTER QUOTE · ПЕРВЫЙ ЗАПУСК</div>
        <h1>Создайте рабочее пространство</h1>
        <p className="muted">Это отдельная защищённая мастерская. Её проекты, закупочные цены и клиенты не видны другим пользователям.</p>
        {query.error ? <div className="notice error">Не удалось создать рабочее пространство. Проверьте поля и повторите.</div> : null}
        <form action={createWorkspace} className="stackForm">
          <label>Название мастерской<input name="name" placeholder="Например, Makster Atelier" maxLength={160} required /></label>
          <div className="formGrid3">
            <label>Страна<select name="countryCode" defaultValue="CZ"><option value="CZ">Чехия</option><option value="DE">Германия</option><option value="PL">Польша</option><option value="AT">Австрия</option><option value="UA">Украина</option></select></label>
            <label>Валюта<select name="currency" defaultValue="CZK"><option>CZK</option><option>EUR</option><option>PLN</option><option>USD</option></select></label>
            <label>Часовой пояс<select name="timezone" defaultValue="Europe/Prague"><option>Europe/Prague</option><option>Europe/Berlin</option><option>Europe/Warsaw</option><option>Europe/Kyiv</option></select></label>
          </div>
          <button className="primary wide" type="submit">Создать мастерскую</button>
        </form>
      </section>
    </main>
  );
}
