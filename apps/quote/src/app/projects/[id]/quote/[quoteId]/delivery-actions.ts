'use server';

import { createHash, randomBytes } from 'node:crypto';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { buildQuotePdf } from '@/lib/quote-pdf';
import { readQuoteSnapshot } from '@/lib/quote-snapshot';
import { requireWorkspace } from '@/lib/workspace';

export type DeliveryActionState = {
  status: 'idle' | 'success' | 'error';
  message: string;
  publicUrl?: string;
  linkId?: string;
  recipient?: string;
  warning?: string;
};

const deliveryRoles = new Set(['owner','admin','sales','technologist']);

function text(formData: FormData, name: string, max = 500) {
  return String(formData.get(name) ?? '').trim().slice(0, max);
}

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function emailLooksValid(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 320;
}

async function publicBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '');
  if (configured) return configured;
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? (host?.includes('localhost') ? 'http' : 'https');
  if (host) return `${proto}://${host}`;
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, '')}`;
  throw new Error('public-url-unavailable');
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char] ?? char));
}

const emailCopy: Record<string, { subject:string; hello:string; intro:string; button:string; valid:string; attachment:string; fallback:string }> = {
  ru: { subject:'Коммерческое предложение', hello:'Здравствуйте', intro:'Мы подготовили для вас коммерческое предложение по проекту', button:'Открыть предложение', valid:'Предложение действительно до', attachment:'PDF также приложен к письму.', fallback:'Если кнопка не открывается, скопируйте ссылку в браузер:' },
  en: { subject:'Quotation', hello:'Hello', intro:'We prepared a quotation for your project', button:'Open quotation', valid:'The quotation is valid until', attachment:'A PDF copy is also attached.', fallback:'If the button does not open, copy this link into your browser:' },
  cs: { subject:'Cenová nabídka', hello:'Dobrý den', intro:'Připravili jsme pro vás cenovou nabídku k projektu', button:'Otevřít nabídku', valid:'Nabídka je platná do', attachment:'PDF verze je také přiložena k e-mailu.', fallback:'Pokud tlačítko nefunguje, zkopírujte tento odkaz do prohlížeče:' },
  de: { subject:'Angebot', hello:'Guten Tag', intro:'Wir haben für Ihr Projekt ein Angebot vorbereitet', button:'Angebot öffnen', valid:'Das Angebot ist gültig bis', attachment:'Eine PDF-Version ist ebenfalls angehängt.', fallback:'Falls die Schaltfläche nicht funktioniert, kopieren Sie diesen Link in den Browser:' },
  pl: { subject:'Oferta', hello:'Dzień dobry', intro:'Przygotowaliśmy ofertę dla projektu', button:'Otwórz ofertę', valid:'Oferta jest ważna do', attachment:'Wiadomość zawiera również załącznik PDF.', fallback:'Jeśli przycisk nie działa, skopiuj ten link do przeglądarki:' },
};

async function loadQuote(projectId: string, quoteId: string) {
  const workspace = await requireWorkspace();
  if (!deliveryRoles.has(workspace.role)) throw new Error('permission');
  const { data: quote, error } = await workspace.supabase
    .from('client_commercial_quotes')
    .select('id, project_id, quote_version, valid_until, quote_json')
    .eq('id', quoteId)
    .eq('project_id', projectId)
    .eq('organization_id', workspace.organization.id)
    .maybeSingle();
  if (error || !quote) throw new Error('quote-not-found');
  const snapshot = readQuoteSnapshot(quote.quote_json);
  if (!snapshot) throw new Error('unsupported-snapshot');
  return { ...workspace, quote, snapshot:{ ...snapshot, quoteId:quote.id, quoteVersion:quote.quote_version, validUntil:quote.valid_until } };
}

async function createAccessLink(projectId: string, quoteId: string, purpose: 'share'|'email', recipientEmail?: string) {
  const loaded = await loadQuote(projectId, quoteId);
  const token = randomBytes(32).toString('base64url');
  const hash = tokenHash(token);
  const { data: linkId, error } = await loaded.supabase.rpc('quote_create_client_access_link', {
    p_quote_id: quoteId,
    p_token_hash: hash,
    p_purpose: purpose,
    p_recipient_email: recipientEmail || null,
    p_expires_at: null,
  });
  if (error || !linkId) throw new Error('link-create');
  const baseUrl = await publicBaseUrl();
  return { ...loaded, token, linkId:String(linkId), publicUrl:`${baseUrl}/q/${token}` };
}

export async function generateClientLink(_previous: DeliveryActionState, formData: FormData): Promise<DeliveryActionState> {
  const projectId = text(formData, 'projectId', 80);
  const quoteId = text(formData, 'quoteId', 80);
  try {
    const created = await createAccessLink(projectId, quoteId, 'share');
    revalidatePath(`/projects/${projectId}/quote/${quoteId}`);
    return { status:'success', message:'Новая защищённая клиентская ссылка создана. Скопируйте её сейчас: открытый токен в базе не хранится.', publicUrl:created.publicUrl, linkId:created.linkId };
  } catch (error) {
    const code = error instanceof Error ? error.message : 'unknown';
    return { status:'error', message:`Не удалось создать клиентскую ссылку (${code}).` };
  }
}

export async function sendQuoteEmail(_previous: DeliveryActionState, formData: FormData): Promise<DeliveryActionState> {
  const projectId = text(formData, 'projectId', 80);
  const quoteId = text(formData, 'quoteId', 80);
  const recipient = text(formData, 'recipientEmail', 320);
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.QUOTE_EMAIL_FROM?.trim();

  if (!apiKey || !from) {
    return { status:'error', message:'Email-провайдер ещё не настроен. Нужны серверные переменные RESEND_API_KEY и QUOTE_EMAIL_FROM.' };
  }
  if (!emailLooksValid(recipient)) return { status:'error', message:'Укажите корректный email клиента.' };

  let created: Awaited<ReturnType<typeof createAccessLink>> | null = null;
  try {
    created = await createAccessLink(projectId, quoteId, 'email', recipient);
    const snapshot = created.snapshot;
    const copy = emailCopy[snapshot.locale] ?? emailCopy.ru;
    const pdf = await buildQuotePdf(snapshot);
    const locale = snapshot.locale === 'en' ? 'en-GB' : snapshot.locale === 'cs' ? 'cs-CZ' : snapshot.locale === 'de' ? 'de-DE' : snapshot.locale === 'pl' ? 'pl-PL' : 'ru-RU';
    const valid = new Intl.DateTimeFormat(locale, { year:'numeric', month:'long', day:'numeric' }).format(new Date(snapshot.validUntil));
    const subject = `${copy.subject} · ${snapshot.project.name} · MQ-v${created.quote.quote_version}`;
    const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#18211d;line-height:1.5"><p>${copy.hello}, ${escapeHtml(snapshot.client.name)}.</p><p>${copy.intro} <strong>${escapeHtml(snapshot.project.name)}</strong>.</p><p><a href="${escapeHtml(created.publicUrl)}" style="display:inline-block;background:#1f7a5a;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">${copy.button}</a></p><p>${copy.valid}: <strong>${escapeHtml(valid)}</strong>.</p><p>${copy.attachment}</p><p style="font-size:12px;color:#68746d">${copy.fallback}<br><span style="word-break:break-all">${escapeHtml(created.publicUrl)}</span></p><p>${escapeHtml(snapshot.supplier.tradeName)}</p></body></html>`;

    const response = await fetch('https://api.resend.com/emails', {
      method:'POST',
      headers:{ 'Authorization':`Bearer ${apiKey}`, 'Content-Type':'application/json' },
      body:JSON.stringify({
        from,
        to:[recipient],
        subject,
        html,
        attachments:[{ filename:`Makster-Quote-v${created.quote.quote_version}.pdf`, content:pdf.toString('base64') }],
      }),
      cache:'no-store',
    });
    const raw = await response.text();
    let payload: Record<string, unknown> = {};
    try { payload = raw ? JSON.parse(raw) as Record<string, unknown> : {}; } catch { payload = {}; }
    const providerMessageId = typeof payload.id === 'string' ? payload.id : '';

    if (!response.ok) {
      await created.supabase.rpc('quote_record_email_delivery', {
        p_quote_id: quoteId,
        p_access_link_id: created.linkId,
        p_recipient_email: recipient,
        p_status: 'failed',
        p_provider_message_id: providerMessageId || null,
        p_error_message: raw.slice(0, 1000) || `HTTP ${response.status}`,
      });
      await created.supabase.rpc('quote_revoke_client_access_link', { p_link_id:created.linkId });
      revalidatePath(`/projects/${projectId}/quote/${quoteId}`);
      return { status:'error', message:`Письмо не отправлено (email provider HTTP ${response.status}). Ссылка отозвана.` };
    }

    const { error: logError } = await created.supabase.rpc('quote_record_email_delivery', {
      p_quote_id: quoteId,
      p_access_link_id: created.linkId,
      p_recipient_email: recipient,
      p_status: 'sent',
      p_provider_message_id: providerMessageId || null,
      p_error_message: null,
    });
    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/quote/${quoteId}`);
    return {
      status:'success',
      message:'Коммерческое предложение отправлено клиенту по email вместе с PDF и защищённой ссылкой.',
      publicUrl:created.publicUrl,
      linkId:created.linkId,
      recipient,
      warning:logError ? 'Письмо ушло, но журнал доставки не удалось записать. Проверьте Supabase log.' : undefined,
    };
  } catch (error) {
    const code = error instanceof Error ? error.message : 'unknown';
    if (created) {
      await created.supabase.rpc('quote_revoke_client_access_link', { p_link_id:created.linkId });
    }
    return { status:'error', message:`Не удалось отправить предложение (${code}).` };
  }
}

export async function revokeClientLink(formData: FormData) {
  const projectId = text(formData, 'projectId', 80);
  const quoteId = text(formData, 'quoteId', 80);
  const linkId = text(formData, 'linkId', 80);
  const { supabase, role } = await requireWorkspace();
  if (!deliveryRoles.has(role)) return;
  await supabase.rpc('quote_revoke_client_access_link', { p_link_id:linkId });
  revalidatePath(`/projects/${projectId}/quote/${quoteId}`);
}
