import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { requireWorkspace } from '@/lib/workspace';
import { createProject } from './actions';

export const dynamic = 'force-dynamic';
type Props = { searchParams: Promise<{ error?: string }> };

export default async function NewProjectPage({ searchParams }: Props) {
  const query = await searchParams;
  const { supabase, organization, role } = await requireWorkspace();
  const { data: subscription } = await supabase.from('quote_subscriptions').select('plan').eq('organization_id', organization.id).maybeSingle();

  return (
    <AppShell organizationName={organization.name} role={role} plan={(subscription?.plan ?? 'free').toUpperCase()}>
      <header className="topbar"><div><span className="eyebrow">НОВЫЙ РАСЧЁТ</span><h1>Создать проект</h1></div><Link href="/" className="textLink">← Главная</Link></header>
      <div className="pageContent narrow">
        {query.error ? <div className="notice error">Не удалось создать проект. Проверьте данные и повторите.</div> : null}
        <section className="panel formPanel"><div className="panelHeader"><div><h2>Основные данные</h2><p className="muted">Детали мебели добавим на следующем экране.</p></div></div>
          <form action={createProject} className="stackForm padded">
            <label>Название проекта<input name="name" placeholder="Например, Кухня Novák" maxLength={200} required autoFocus /></label>
            <div className="formGrid2">
              <label>Тип мебели<select name="projectType" defaultValue="kitchen"><option value="kitchen">Кухня</option><option value="wardrobe">Шкаф</option><option value="built_in">Встроенная мебель</option><option value="cabinet">Отдельный корпус</option><option value="sideboard">Комод / тумба</option><option value="mixed">Смешанный проект</option></select></label>
              <label>Валюта<select name="currency" defaultValue={organization.currency}><option value="CZK">CZK</option><option value="EUR">EUR</option><option value="PLN">PLN</option><option value="USD">USD</option></select></label>
            </div>
            <div className="formActions"><Link href="/" className="secondary linkButton">Отмена</Link><button type="submit" className="primary">Создать и открыть</button></div>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
