import { createHash, randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { requireWorkspace } from '@/lib/workspace';

const deliveryRoles = new Set(['owner', 'admin', 'sales', 'technologist']);

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ quoteId: string }> },
) {
  try {
    const { quoteId } = await params;
    const { supabase, role } = await requireWorkspace();
    if (!deliveryRoles.has(role)) {
      return NextResponse.json({ error: 'permission' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : '';
    if (!/^[0-9a-fA-F-]{36}$/.test(projectId) || !/^[0-9a-fA-F-]{36}$/.test(quoteId)) {
      return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
    }

    const { data: quote, error: quoteError } = await supabase
      .from('client_commercial_quotes')
      .select('id, project_id')
      .eq('id', quoteId)
      .eq('project_id', projectId)
      .maybeSingle();

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'quote-not-found' }, { status: 404 });
    }

    const token = randomBytes(32).toString('base64url');
    const hash = tokenHash(token);
    const { data: linkId, error } = await supabase.rpc('quote_create_client_access_link', {
      p_quote_id: quoteId,
      p_token_hash: hash,
      p_purpose: 'share',
      p_recipient_email: null,
      p_expires_at: null,
    });

    if (error || !linkId) {
      return NextResponse.json({ error: error?.message ?? 'link-create' }, { status: 400 });
    }

    const origin = new URL(request.url).origin;
    return NextResponse.json({
      publicUrl: `${origin}/q/${token}`,
      linkId: String(linkId),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'unknown';
    return NextResponse.json({ error: code }, { status: 500 });
  }
}
