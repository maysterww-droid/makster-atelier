import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatMinor } from '@/lib/calculation';
import { minorFromUnknown } from '@/lib/project-pricing';
import { readQuoteSnapshot } from '@/lib/quote-snapshot';
import { requireWorkspace } from '@/lib/workspace';
import { appendQuoteStatus } from '../../publish-actions';
import { ClientDeliveryPanel } from './client-delivery-panel';
import { revokeClientLink } from './delivery-actions';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ id:string; quoteId:string }>; searchParams: Promise<{ saved?:string; error?:string }> };

const statusName: Record<string,string> = { approved:'Выпущено', sent:'Отправлено', accepted:'Принято клиентом', rejected:'Отклонено', expired:'Истекло', superseded:'Заменено' };
const actionRoles = new Set(['owner','admin','sales','technologist']);

export default async function PublishedQuotePage({ params, searchParams }: Props) {
  const { id, quoteId } = await params;
  const query = await searchParams;
  const { supabase, organization, role } = await requireWorkspace();
  const [quoteResult, eventResult, linksResult, deliveriesResult] = await Promise.all([
    supabase.from('client_commercial_quotes').select('id, project_id, quote_version, issued_at, valid_until, currency, net_amount_minor, tax_minor, total_amount_minor, quote_json, client_name').eq('id', quoteId).eq('project_id', id).eq('organization_id', organization.id).maybeSingle(),
    supabase.from('client_quote_status_events').select('id, status, note, created_at').eq('quote_id', quoteId).eq('organization_id', organization.id).order('created_at', { ascending:false }),
    supabase.from('quote_client_access_links').select('id, purpose, recipient_email, expires_at, revoked_at, created_at').eq('quote_id', quoteId).eq('organization_id', organization.id).order('created_at', { ascending:false }).limit(20),
    supabase.from('quote_email_deliveries').select('id, recipient_email, provider, status, provider_message_id, error_message, created_at, sent_at').eq('quote_id', quoteId).eq('organization_id', organization.id).order('created_at', { ascending:false }).limit(20),
  ]);
  const quote = quoteResult.data;
  const events = eventResult.data;
  if (quoteResult.error || !quote) notFound();
  if (eventResult.error) throw new Error('Не удалось загрузить историю статусов.');
  if (linksResult.error) throw new Error('Не удалось загрузить клиентские ссылки.');
  if (deliveriesResult.error) throw new Error('Не удалось загрузить журнал email-доставки.');
  const parsed = readQuoteSnapshot(quote.quote_json);
  if (!parsed) throw new Error('Формат snapshot предложения не поддерживается.');
  const snapshot = { ...parsed, quoteId:quote.id, quoteVersion:quote.quote_version, issuedAt:quote.issued_at, validUntil:quote.valid_until };
  const latest = events?.[0]?.status ?? 'approved';
  const canUpdate = actionRoles.has(role) && !['accepted','rejected','expired'].includes(latest);
  const canDeliver = actionRoles.has(role);
  const deposit = minorFromUnknown(snapshot.amounts.depositMinor);
  const now = Date.now();
  const activeLinks = (linksResult.data ?? []).filter((link) => !link.revoked_at && new Date(link.expires_at).getTime() > now);
  const deliveries = deliveriesResult.data ?? [];
  const emailConfigured = Boolean(process.env.RESEND_API_KEY?.trim() && process.env.QUOTE_EMAIL_FROM?.trim());

  return <main className="quoteDocument">
    <style>{`
      body{background:#eef2ef}.quoteDocument{max-width:920px;margin:24px auto;background:#fff;color:#18211d;padding:48px;box-shadow:0 18px 60px rgba(24,33,29,.12);font-family:Inter,Arial,sans-serif}.toolbar{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:30px}.toolbarGroup{display:flex;gap:8px;flex-wrap:wrap}.toolbar a,.toolbar button,.deliveryPanel button,.linkHistory button{border:0;border-radius:9px;padding:10px 13px;text-decoration:none;font-weight:700;cursor:pointer}.secondary{background:#edf2ef;color:#244438}.primary{background:#1f7a5a;color:#fff}.danger{background:#f5e8e8;color:#8b3131}.head{display:flex;justify-content:space-between;gap:30px;border-bottom:2px solid #18211d;padding-bottom:22px}.brand{font-size:25px;font-weight:800;color:#196c50}.brand small{display:block;font-size:11px;color:#68746d;margin-top:4px}.ref{text-align:right;color:#68746d;font-size:12px}.ref strong{display:block;color:#18211d;font-size:18px}.title{margin:34px 0 22px}.title h1{font-size:32px;margin:0}.status{display:inline-block;margin-top:10px;border:1px solid #1f7a5a;color:#1f7a5a;padding:5px 9px;border-radius:6px;font-size:11px;font-weight:800}.info{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin:24px 0 32px}.info h3{font-size:11px;text-transform:uppercase;color:#68746d}.info span,.info strong{display:block;margin-top:4px}.table{width:100%;border-collapse:collapse;margin:18px 0 28px}.table th,.table td{text-align:left;padding:11px;border-bottom:1px solid #dfe7e2}.table th{font-size:11px;text-transform:uppercase;color:#68746d}.totals{width:min(440px,100%);margin-left:auto}.totals div{display:flex;justify-content:space-between;padding:8px 0}.totals .grand{border-top:2px solid #18211d;font-size:21px;font-weight:800;padding-top:13px}.terms{margin-top:30px;padding:18px;background:#f4f7f5;border-radius:12px}.terms div{margin:7px 0}.deliveryPanel{margin-top:36px;border-top:1px solid #dfe7e2;padding-top:24px}.deliveryColumns{display:grid;grid-template-columns:1fr 1fr;gap:22px}.deliveryColumns>div{padding:18px;background:#f7f9f8;border-radius:12px}.deliveryColumns h3{margin-top:0}.deliveryColumns p{color:#68746d;font-size:13px;line-height:1.45}.mailForm{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.mailForm input,.shareLine input{flex:1;min-width:210px;padding:10px;border:1px solid #cfd9d3;border-radius:8px;background:#fff}.deliveryConfig{font-size:12px;padding:10px;background:#fff3d6;border-radius:8px;margin-bottom:10px}.deliveryResult{margin-top:12px;padding:11px;border-radius:9px;font-size:12px}.deliveryResult.success{background:#eaf6ef}.deliveryResult.error{background:#faeeee;color:#8b3131}.deliveryResult small{display:block;margin-top:6px}.shareLine{display:flex;gap:8px;margin-top:10px}.linkHistory,.deliveryHistory,.events{margin-top:36px;border-top:1px solid #dfe7e2;padding-top:22px}.historyRow{display:flex;justify-content:space-between;gap:14px;align-items:center;padding:10px 0;border-bottom:1px solid #edf1ef}.historyRow small{display:block;color:#68746d;margin-top:4px}.events article{padding:8px 0}.events small{color:#68746d}.statusForm{margin-top:18px;display:flex;gap:8px;flex-wrap:wrap}.statusForm input[type=text]{flex:1;min-width:220px;padding:10px;border:1px solid #cfd9d3;border-radius:8px}@media(max-width:700px){.quoteDocument{margin:0;padding:24px}.head,.info,.deliveryColumns{display:grid;grid-template-columns:1fr}.ref{text-align:left}.historyRow{align-items:flex-start;flex-direction:column}.shareLine{flex-direction:column}}@media print{body{background:#fff}.quoteDocument{max-width:none;margin:0;padding:14mm;box-shadow:none}.toolbar,.deliveryPanel,.linkHistory,.deliveryHistory,.events{display:none}@page{size:A4;margin:0}}
    `}</style>
    <div className="toolbar"><div className="toolbarGroup"><Link className="secondary" href={`/projects/${id}`}>← Проект</Link><Link className="secondary" href={`/projects/${id}/quote`}>Живой просмотр</Link></div><div className="toolbarGroup"><Link className="primary" href={`/projects/${id}/quote/${quoteId}/pdf`}>Скачать PDF</Link></div></div>
    {query.saved === 'status' ? <p className="status">Статус сохранён</p> : null}{query.error ? <p className="status">Ошибка: {query.error}</p> : null}
    <header className="head"><div className="brand">{snapshot.supplier.tradeName}<small>{snapshot.supplier.legalName}</small></div><div className="ref"><strong>MQ-v{quote.quote_version}</strong><span>{new Intl.DateTimeFormat('ru-RU').format(new Date(snapshot.issuedAt))}</span><span>до {new Intl.DateTimeFormat('ru-RU').format(new Date(snapshot.validUntil))}</span></div></header>
    <section className="title"><h1>Коммерческое предложение</h1><span className="status">{statusName[latest] ?? latest}</span></section>
    <section className="info"><div><h3>Клиент</h3><strong>{snapshot.client.name}</strong>{snapshot.client.email ? <span>{snapshot.client.email}</span> : null}{snapshot.client.phone ? <span>{snapshot.client.phone}</span> : null}{snapshot.client.address ? <span>{snapshot.client.address}</span> : null}</div><div><h3>Проект</h3><strong>{snapshot.project.name}</strong><span>Ревизия {snapshot.project.revisionNumber}</span><span>Версия предложения {quote.quote_version}</span></div></section>
    <h2>Состав проекта</h2>
    <table className="table"><thead><tr><th>Модуль</th><th>Размеры</th><th>Кол-во</th></tr></thead><tbody>{snapshot.modules.map((module) => <tr key={module.id}><td>{module.name}</td><td>{module.widthMm} × {module.heightMm} × {module.depthMm} мм</td><td>{module.quantity}</td></tr>)}</tbody></table>
    {snapshot.extras.length ? <p><strong>Включено:</strong> {snapshot.extras.map((extra) => extra.name).join(' · ')}</p> : null}
    <section className="totals"><div><span>Итого без НДС</span><strong>{formatMinor(minorFromUnknown(snapshot.amounts.netMinor), snapshot.currency)}</strong></div>{snapshot.amounts.taxBps > 0 ? <div><span>НДС / налог {(snapshot.amounts.taxBps/100).toFixed(2)}%</span><strong>{formatMinor(minorFromUnknown(snapshot.amounts.taxMinor), snapshot.currency)}</strong></div> : null}<div className="grand"><span>К оплате</span><strong>{formatMinor(minorFromUnknown(snapshot.amounts.totalMinor), snapshot.currency)}</strong></div></section>
    {(snapshot.terms.depositBps > 0 || snapshot.terms.productionLeadText || snapshot.terms.paymentTerms || snapshot.terms.warrantyText || snapshot.terms.clientNote) ? <section className="terms"><h3>Условия</h3>{snapshot.terms.depositBps > 0 ? <div><strong>Аванс:</strong> {(snapshot.terms.depositBps/100).toFixed(2)}% · {formatMinor(deposit, snapshot.currency)}</div> : null}{snapshot.terms.productionLeadText ? <div><strong>Срок изготовления:</strong> {snapshot.terms.productionLeadText}</div> : null}{snapshot.terms.paymentTerms ? <div><strong>Оплата:</strong> {snapshot.terms.paymentTerms}</div> : null}{snapshot.terms.warrantyText ? <div><strong>Гарантия / условия:</strong> {snapshot.terms.warrantyText}</div> : null}{snapshot.terms.clientNote ? <div><strong>Примечание:</strong> {snapshot.terms.clientNote}</div> : null}</section> : null}

    {canDeliver ? <ClientDeliveryPanel projectId={id} quoteId={quoteId} defaultEmail={snapshot.client.email} emailConfigured={emailConfigured}/> : null}

    {canDeliver ? <section className="linkHistory"><h3>Активные клиентские ссылки</h3>{activeLinks.length ? activeLinks.map((link) => <div className="historyRow" key={link.id}><div><strong>{link.purpose === 'email' ? 'Email-ссылка' : 'Ссылка для копирования'}</strong><small>{link.recipient_email ? `${link.recipient_email} · ` : ''}создана {new Intl.DateTimeFormat('ru-RU', { dateStyle:'medium', timeStyle:'short' }).format(new Date(link.created_at))} · действует до {new Intl.DateTimeFormat('ru-RU').format(new Date(link.expires_at))}</small></div><form action={revokeClientLink}><input type="hidden" name="projectId" value={id}/><input type="hidden" name="quoteId" value={quoteId}/><input type="hidden" name="linkId" value={link.id}/><button type="submit" className="danger">Отозвать</button></form></div>) : <p>Активных ссылок нет.</p>}</section> : null}

    {canDeliver ? <section className="deliveryHistory"><h3>Журнал email-доставки</h3>{deliveries.length ? deliveries.map((delivery) => <div className="historyRow" key={delivery.id}><div><strong>{delivery.status === 'sent' ? 'Отправлено' : 'Ошибка отправки'} · {delivery.recipient_email}</strong><small>{new Intl.DateTimeFormat('ru-RU', { dateStyle:'medium', timeStyle:'short' }).format(new Date(delivery.created_at))}{delivery.provider_message_id ? ` · ID ${delivery.provider_message_id}` : ''}{delivery.error_message ? ` · ${delivery.error_message}` : ''}</small></div><span className="status">{delivery.provider}</span></div>) : <p>Отправок пока нет.</p>}</section> : null}

    <section className="events"><h3>История статусов</h3>{events?.map((event) => <article key={event.id}><strong>{statusName[event.status] ?? event.status}</strong><small>{new Intl.DateTimeFormat('ru-RU', { dateStyle:'medium', timeStyle:'short' }).format(new Date(event.created_at))}{event.note ? ` · ${event.note}` : ''}</small></article>)}{canUpdate ? <form action={appendQuoteStatus} className="statusForm"><input type="hidden" name="projectId" value={id}/><input type="hidden" name="quoteId" value={quoteId}/><input name="note" type="text" placeholder="Комментарий к статусу (необязательно)"/><button className="secondary" name="status" value="sent">Отметить отправленным</button><button className="primary" name="status" value="accepted">Клиент принял</button><button className="danger" name="status" value="rejected">Клиент отклонил</button></form> : null}</section>
  </main>;
}
