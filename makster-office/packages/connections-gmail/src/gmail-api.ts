import type { GmailHistoryPage, GmailListMessagesPage, GmailMessageEnvelope, GmailProfile, GmailWatchResult } from './types.js';

function decodeBase64url(value: string): string {
  if (!value) return '';
  return Buffer.from(value, 'base64url').toString('utf8');
}

interface GmailPart {
  mimeType?: string;
  filename?: string;
  headers?: Array<{name?:string;value?:string}>;
  body?: { data?: string; size?: number };
  parts?: GmailPart[];
}

function header(part: GmailPart | undefined, name: string): string | undefined {
  const found = part?.headers?.find(h => h.name?.toLowerCase() === name.toLowerCase());
  return found?.value;
}

function textFromPart(part: GmailPart | undefined): string {
  if (!part) return '';
  if ((part.mimeType === 'text/plain' || !part.mimeType) && part.body?.data) return decodeBase64url(part.body.data);
  const children = part.parts ?? [];
  for (const child of children) {
    if (child.mimeType === 'text/plain') {
      const text = textFromPart(child);
      if (text) return text;
    }
  }
  for (const child of children) {
    const text = textFromPart(child);
    if (text) return text;
  }
  return '';
}

export function extractEmailAddress(value: string | undefined): string {
  const raw = (value ?? '').trim();
  const bracket = raw.match(/<([^<>\s]+@[^<>\s]+)>/);
  if (bracket?.[1]) return bracket[1].trim().toLowerCase();
  const plain = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return plain?.[0]?.toLowerCase() ?? raw.toLowerCase();
}

export function parseGmailMessage(raw: any): GmailMessageEnvelope {
  if (!raw?.id || !raw?.threadId) throw new Error('gmail_message_missing_identity');
  const payload = raw.payload as GmailPart | undefined;
  const refs = header(payload,'References')?.split(/\s+/).filter(Boolean);
  return {
    id: String(raw.id),
    threadId: String(raw.threadId),
    ...(raw.historyId ? { historyId:String(raw.historyId) } : {}),
    ...(raw.internalDate ? { internalDate:String(raw.internalDate) } : {}),
    from: extractEmailAddress(header(payload,'From')),
    ...(header(payload,'To') ? { to:header(payload,'To')! } : {}),
    subject: header(payload,'Subject') ?? '',
    ...(header(payload,'Message-ID') ? { rfcMessageId:header(payload,'Message-ID')! } : {}),
    ...(header(payload,'In-Reply-To') ? { inReplyTo:header(payload,'In-Reply-To')! } : {}),
    ...(refs?.length ? { references:refs } : {}),
    text: textFromPart(payload),
    ...(raw.snippet ? { snippet:String(raw.snippet) } : {}),
  };
}

export class GmailApiClient {
  constructor(private readonly accessToken: string, private readonly fetchImpl: typeof fetch = fetch) {
    if (!accessToken) throw new Error('gmail_access_token_required');
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.fetchImpl(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
      ...init,
      headers: { authorization:`Bearer ${this.accessToken}`, ...(init.headers ?? {}) },
    });
    const text = await response.text();
    if (!response.ok) {
      const error = new Error(`gmail_api_failed:${response.status}:${text}`) as Error & {status?:number};
      error.status = response.status;
      throw error;
    }
    return text ? JSON.parse(text) as T : (undefined as T);
  }

  async getProfile(): Promise<GmailProfile> {
    const raw = await this.request<any>('profile');
    if (!raw?.emailAddress || !raw?.historyId) throw new Error('gmail_profile_invalid');
    return { emailAddress:String(raw.emailAddress), historyId:String(raw.historyId), ...(typeof raw.messagesTotal==='number'?{messagesTotal:raw.messagesTotal}:{}), ...(typeof raw.threadsTotal==='number'?{threadsTotal:raw.threadsTotal}:{}) };
  }

  async watch(topicName: string, labelIds: string[] = ['INBOX']): Promise<GmailWatchResult> {
    if (!topicName) throw new Error('gmail_watch_topic_required');
    const raw = await this.request<any>('watch', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({topicName,labelIds,labelFilterBehavior:'INCLUDE'}) });
    if (!raw?.historyId || !raw?.expiration) throw new Error('gmail_watch_response_invalid');
    return { historyId:String(raw.historyId), expiration:String(raw.expiration) };
  }

  async stopWatch(): Promise<void> {
    await this.request<void>('stop',{method:'POST'});
  }

  async listHistory(startHistoryId: string, pageToken?: string): Promise<GmailHistoryPage> {
    const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/history');
    url.searchParams.set('startHistoryId', startHistoryId);
    url.searchParams.append('historyTypes','messageAdded');
    url.searchParams.set('labelId','INBOX');
    if (pageToken) url.searchParams.set('pageToken',pageToken);
    const response = await this.fetchImpl(url,{headers:{authorization:`Bearer ${this.accessToken}`}});
    const text = await response.text();
    if (!response.ok) {
      const error = new Error(`gmail_history_failed:${response.status}:${text}`) as Error & {status?:number};
      error.status=response.status;
      throw error;
    }
    const raw = JSON.parse(text) as any;
    const ids = new Set<string>();
    for (const h of raw.history ?? []) for (const added of h.messagesAdded ?? []) if (added?.message?.id) ids.add(String(added.message.id));
    return { historyId:String(raw.historyId ?? startHistoryId), messageIds:[...ids], ...(raw.nextPageToken?{nextPageToken:String(raw.nextPageToken)}:{}) };
  }

  async getMessage(messageId: string): Promise<GmailMessageEnvelope> {
    const params = new URLSearchParams({format:'full'});
    const raw = await this.request<any>(`messages/${encodeURIComponent(messageId)}?${params.toString()}`);
    return parseGmailMessage(raw);
  }

  async listRecentInbox(maxResults = 100, pageToken?: string): Promise<GmailListMessagesPage> {
    const params = new URLSearchParams({labelIds:'INBOX',maxResults:String(Math.max(1,Math.min(500,maxResults))),q:'newer_than:14d'});
    if(pageToken) params.set('pageToken',pageToken);
    const raw = await this.request<any>(`messages?${params.toString()}`);
    return { messageIds:(raw.messages??[]).flatMap((m:any)=>m?.id?[String(m.id)]:[]), ...(raw.nextPageToken?{nextPageToken:String(raw.nextPageToken)}:{}) };
  }
}
