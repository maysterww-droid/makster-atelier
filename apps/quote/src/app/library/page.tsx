import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { QUOTE_MODULE_PRESETS } from '@/lib/module-presets';
import { requireWorkspace } from '@/lib/workspace';
import { addPresetToProject } from './actions';

export const dynamic = 'force-dynamic';
type Props = { searchParams: Promise<{ project?: string; error?: string }> };

const groupLabel: Record<string, string> = {
  'base-door': 'Нижние с дверями',
  'base-drawer': 'Нижние с ящиками',
  sink: 'Под мойку',
};

export default async function LibraryPage({ searchParams }: Props) {
  const query = await searchParams;
  const { supabase, organization, role } = await requireWorkspace();
  const [{ data: projects, error: projectError }, { data: subscription }] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, project_type')
      .eq('organization_id', organization.id)
      .is('archived_at', null)
      .order('updated_at', { ascending: false })
      .limit(100),
    supabase.from('quote_subscriptions').select('plan').eq('organization_id', organization.id).maybeSingle(),
  ]);
  if (projectError) throw new Error(`Не удалось загрузить проекты: ${projectError.message}`);

  const selectedProject = (projects ?? []).find((project) => project.id === query.project) ?? projects?.[0] ?? null;
  const groups = [...new Set(QUOTE_MODULE_PRESETS.map((preset) => preset.group))];

  return <AppShell organizationName={organization.name} role={role} plan={(subscription?.plan ?? 'free').toUpperCase()}>
    <header className="topbar">
      <div><span className="eyebrow">STANDARD MODULE LIBRARY · 0.1.7</span><h1>Библиотека модулей</h1></div>
      <div className="topActions">{selectedProject ? <Link href={`/projects/${selectedProject.id}`} className="secondary linkButton">Открыть проект</Link> : null}<Link href="/" className="textLink">← Главная</Link></div>
    </header>

    <div className="pageContent">
      {query.error ? <div className="notice error">Не удалось добавить модуль ({query.error}).</div> : null}
      <section className="panel" style={{ marginBottom: 18 }}>
        <div className="panelHeader"><div><span className="eyebrow">ЦЕЛЕВОЙ ПРОЕКТ</span><h2>Куда добавить модуль</h2><p className="muted">Пресет создаёт геометрию и конструкцию. Материал, фасад, кромку и фурнитуру выбираем уже в проекте по вашему Price Book.</p></div></div>
        <form method="get" className="stackForm padded">
          <label>Проект<select name="project" defaultValue={selectedProject?.id ?? ''}>{!projects?.length ? <option value="">Нет активных проектов</option> : null}{(projects ?? []).map((project) => <option key={project.id} value={project.id}>{project.name} · {project.project_type}</option>)}</select></label>
          <div className="formActions"><button className="secondary" type="submit">Выбрать проект</button><Link href="/projects/new" className="primary linkButton">+ Новый проект</Link></div>
        </form>
      </section>

      {!selectedProject ? <div className="notice warning"><strong>Сначала создайте проект.</strong> После этого стандартный модуль можно добавить одним нажатием.</div> : null}

      {groups.map((group) => <section className="panel" style={{ marginBottom: 18 }} key={group}>
        <div className="panelHeader"><div><span className="eyebrow">STANDARD PRESETS</span><h2>{groupLabel[group] ?? group}</h2></div></div>
        <div className="metricGrid" style={{ padding: 16, marginBottom: 0 }}>
          {QUOTE_MODULE_PRESETS.filter((preset) => preset.group === group).map((preset) => <article className="metricCard" key={preset.key}>
            <span>{preset.moduleKey.toUpperCase()}</span>
            <strong style={{ fontSize: 18 }}>{preset.name}</strong>
            <small>{preset.description}</small>
            <div className="costRows" style={{ padding: '10px 0 0' }}>
              <div><span>Размер</span><strong>{preset.widthMm} × {preset.heightMm} × {preset.depthMm} мм</strong></div>
              {preset.moduleKey === 'b-drawer' ? <div><span>Ящиков</span><strong>{preset.drawers}</strong></div> : <div><span>Дверей</span><strong>{preset.doors}</strong></div>}
              <div><span>Задняя стенка</span><strong>{preset.backMode === 'none' ? 'нет' : preset.backMode === 'groove' ? 'в паз' : 'накладная'}</strong></div>
            </div>
            {selectedProject ? <form action={addPresetToProject} style={{ marginTop: 12 }}><input type="hidden" name="projectId" value={selectedProject.id}/><input type="hidden" name="presetKey" value={preset.key}/><button className="primary wide" type="submit">Добавить в {selectedProject.name}</button></form> : null}
          </article>)}
        </div>
      </section>)}

      <div className="notice warning"><strong>Граница Quote.</strong> Эти пресеты нужны для быстрого коммерческого расчёта. Точная производственная библиотека с техникой, присадкой, Blum-правилами и CNC остаётся слоем Makster Pro.</div>
    </div>
  </AppShell>;
}
