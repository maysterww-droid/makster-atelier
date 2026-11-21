import { randomUUID } from 'node:crypto';
export class MemoryEmailProvider {
    kind = 'memory';
    sent = [];
    async send(email) {
        const result = { provider: 'memory', messageId: `mem-${randomUUID()}`, threadId: email.threadId ?? `mem-thread-${randomUUID()}`, ...(email.messageIdHeader ? { rfcMessageId: email.messageIdHeader } : {}), sentAt: new Date().toISOString() };
        this.sent.push({ email, result });
        return result;
    }
}
function base64url(input) {
    const b = typeof input === 'string' ? Buffer.from(input, 'utf8') : Buffer.from(input);
    return b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function encodeHeader(value) {
    return /[^\x20-\x7E]/.test(value) ? `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=` : value;
}
export function buildRfc2822(email) {
    const headers = [
        `To: ${email.to}`,
        `Subject: ${encodeHeader(email.subject)}`,
        ...(email.messageIdHeader ? [`Message-ID: ${email.messageIdHeader}`] : []),
        'MIME-Version: 1.0',
    ];
    if (email.inReplyTo)
        headers.push(`In-Reply-To: ${email.inReplyTo}`);
    if (email.references?.length)
        headers.push(`References: ${email.references.join(' ')}`);
    const attachments = email.attachments ?? [];
    if (!attachments.length) {
        headers.push('Content-Type: text/plain; charset="UTF-8"', 'Content-Transfer-Encoding: 8bit');
        return `${headers.join('\r\n')}\r\n\r\n${email.text}`;
    }
    const boundary = `makster_${randomUUID().replaceAll('-', '')}`;
    headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    const parts = [
        `--${boundary}\r\nContent-Type: text/plain; charset="UTF-8"\r\nContent-Transfer-Encoding: 8bit\r\n\r\n${email.text}`,
        ...attachments.map(a => `--${boundary}\r\nContent-Type: ${a.contentType}; name="${a.filename}"\r\nContent-Disposition: attachment; filename="${a.filename}"\r\nContent-Transfer-Encoding: base64\r\n\r\n${Buffer.from(typeof a.content === 'string' ? a.content : a.content).toString('base64').match(/.{1,76}/g)?.join('\r\n') ?? ''}`),
        `--${boundary}--`,
    ];
    return `${headers.join('\r\n')}\r\n\r\n${parts.join('\r\n')}`;
}
export class GmailApiEmailProvider {
    accessToken;
    fetchImpl;
    kind = 'gmail';
    constructor(accessToken, fetchImpl = fetch) {
        this.accessToken = accessToken;
        this.fetchImpl = fetchImpl;
        if (!accessToken)
            throw new Error('gmail_access_token_required');
    }
    async send(email) {
        const raw = base64url(buildRfc2822(email));
        const response = await this.fetchImpl('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
            method: 'POST',
            headers: { 'authorization': `Bearer ${this.accessToken}`, 'content-type': 'application/json' },
            body: JSON.stringify({ raw, ...(email.threadId ? { threadId: email.threadId } : {}) }),
        });
        if (!response.ok)
            throw new Error(`gmail_send_failed:${response.status}:${await response.text()}`);
        const body = await response.json();
        if (!body.id)
            throw new Error('gmail_send_missing_message_id');
        return { provider: 'gmail', messageId: body.id, ...(body.threadId ? { threadId: body.threadId } : {}), ...(email.messageIdHeader ? { rfcMessageId: email.messageIdHeader } : {}), sentAt: new Date().toISOString() };
    }
}
