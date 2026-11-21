export async function readJson(req) {
    const chunks = [];
    for await (const chunk of req)
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    if (chunks.length === 0)
        return {};
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
export function json(res, status, body) {
    res.writeHead(status, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'access-control-allow-origin': '*',
        'access-control-allow-headers': 'content-type, authorization, x-client-share-token',
        'access-control-allow-methods': 'GET,POST,OPTIONS',
    });
    res.end(JSON.stringify(body, null, 2));
}
export function bearer(req) {
    const value = req.headers.authorization;
    if (!value?.startsWith('Bearer '))
        return undefined;
    return value.slice('Bearer '.length);
}
