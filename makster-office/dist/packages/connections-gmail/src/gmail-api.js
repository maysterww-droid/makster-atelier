function decodeBase64url(value) {
    if (!value)
        return '';
    return Buffer.from(value, 'base64url').toString('utf8');
}
function header(part, name) {
    const found = part?.headers?.find(h => h.name?.toLowerCase() === name.toLowerCase());
    return found?.value;
}
function textFromPart(part) {
    if (!part)
        return '';
    if ((part.mimeType === 'text/plain' || !part.mimeType) && part.body?.data)
        return decodeBase64url(part.body.data);
    const children = part.parts ?? [];
    for (const child of children) {
        if (child.mimeType === 'text/plain') {
            const text = textFromPart(child);
            if (text)
                return text;
        }
    }
    for (const child of children) {
        const text = textFromPart(child);
        if (text)
            return text;
    }
    return '';
}
export function extractEmailAddress(value) {
    const raw = (value ?? '').trim();
    const bracket = raw.match(/<([^<>\s]+@[^<>\s]+)>/);
    if (bracket?.[1])
        return bracket[1].trim().toLowerCase();
    const plain = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    return plain?.[0]?.toLowerCase() ?? raw.toLowerCase();
}
export function parseGmailMessage(raw) {
    if (!raw?.id || !raw?.threadId)
        throw new Error('gmail_message_missing_identity');
    const payload = raw.payload;
    const refs = header(payload, 'References')?.split(/\s+/).filter(Boolean);
    return {
        id: String(raw.id),
        threadId: String(raw.threadId),
        ...(raw.historyId ? { historyId: String(raw.historyId) } : {}),
        ...(raw.internalDate ? { internalDate: String(raw.internalDate) } : {}),
        from: extractEmailAddress(header(payload, 'From')),
        ...(header(payload, 'To') ? { to: header(payload, 'To') } : {}),
        subject: header(payload, 'Subject') ?? '',
        ...(header(payload, 'Message-ID') ? { rfcMessageId: header(payload, 'Message-ID') } : {}),
        ...(header(payload, 'In-Reply-To') ? { inReplyTo: header(payload, 'In-Reply-To') } : {}),
        ...(refs?.length ? { references: refs } : {}),
        text: textFromPart(payload),
        ...(raw.snippet ? { snippet: String(raw.snippet) } : {}),
    };
}
export class GmailApiClient {
    accessToken;
    fetchImpl;
    constructor(accessToken, fetchImpl = fetch) {
        this.accessToken = accessToken;
        this.fetchImpl = fetchImpl;
        if (!accessToken)
            throw new Error('gmail_access_token_required');
    }
    async request(path, init = {}) {
        const response = await this.fetchImpl(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
            ...init,
            headers: { authorization: `Bearer ${this.accessToken}`, ...(init.headers ?? {}) },
        });
        const text = await response.text();
        if (!response.ok) {
            const error = new Error(`gmail_api_failed:${response.status}:${text}`);
            error.status = response.status;
            throw error;
        }
        return text ? JSON.parse(text) : undefined;
    }
    async getProfile() {
        const raw = await this.request('profile');
        if (!raw?.emailAddress || !raw?.historyId)
            throw new Error('gmail_profile_invalid');
        return { emailAddress: String(raw.emailAddress), historyId: String(raw.historyId), ...(typeof raw.messagesTotal === 'number' ? { messagesTotal: raw.messagesTotal } : {}), ...(typeof raw.threadsTotal === 'number' ? { threadsTotal: raw.threadsTotal } : {}) };
    }
    async watch(topicName, labelIds = ['INBOX']) {
        if (!topicName)
            throw new Error('gmail_watch_topic_required');
        const raw = await this.request('watch', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ topicName, labelIds, labelFilterBehavior: 'INCLUDE' }) });
        if (!raw?.historyId || !raw?.expiration)
            throw new Error('gmail_watch_response_invalid');
        return { historyId: String(raw.historyId), expiration: String(raw.expiration) };
    }
    async stopWatch() {
        await this.request('stop', { method: 'POST' });
    }
    async listHistory(startHistoryId, pageToken) {
        const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/history');
        url.searchParams.set('startHistoryId', startHistoryId);
        url.searchParams.append('historyTypes', 'messageAdded');
        url.searchParams.set('labelId', 'INBOX');
        if (pageToken)
            url.searchParams.set('pageToken', pageToken);
        const response = await this.fetchImpl(url, { headers: { authorization: `Bearer ${this.accessToken}` } });
        const text = await response.text();
        if (!response.ok) {
            const error = new Error(`gmail_history_failed:${response.status}:${text}`);
            error.status = response.status;
            throw error;
        }
        const raw = JSON.parse(text);
        const ids = new Set();
        for (const h of raw.history ?? [])
            for (const added of h.messagesAdded ?? [])
                if (added?.message?.id)
                    ids.add(String(added.message.id));
        return { historyId: String(raw.historyId ?? startHistoryId), messageIds: [...ids], ...(raw.nextPageToken ? { nextPageToken: String(raw.nextPageToken) } : {}) };
    }
    async getMessage(messageId) {
        const params = new URLSearchParams({ format: 'full' });
        const raw = await this.request(`messages/${encodeURIComponent(messageId)}?${params.toString()}`);
        return parseGmailMessage(raw);
    }
    async listRecentInbox(maxResults = 100, pageToken) {
        const params = new URLSearchParams({ labelIds: 'INBOX', maxResults: String(Math.max(1, Math.min(500, maxResults))), q: 'newer_than:14d' });
        if (pageToken)
            params.set('pageToken', pageToken);
        const raw = await this.request(`messages?${params.toString()}`);
        return { messageIds: (raw.messages ?? []).flatMap((m) => m?.id ? [String(m.id)] : []), ...(raw.nextPageToken ? { nextPageToken: String(raw.nextPageToken) } : {}) };
    }
}
