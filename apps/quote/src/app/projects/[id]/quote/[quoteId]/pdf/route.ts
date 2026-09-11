import { buildQuotePdf } from '@/lib/quote-pdf';
import { readQuoteSnapshot } from '@/lib/quote-snapshot';
import { requireWorkspace } from '@/lib/workspace';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id:string; quoteId:string }> };

function safeFilename(value: string) {
  const normalized = value.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return normalized.slice(0, 80) || 'Makster-Quote';
}

export async function GET(_request: Request, { params }: Context) {
  const { id, quoteId } = await params;
  const { supabase, organization } = await requireWorkspace();
  const { data:quote, error } = await supabase
    .from('client_commercial_quotes')
    .select('id, quote_version, issued_at, valid_until, quote_json')
    .eq('id', quoteId)
    .eq('project_id', id)
    .eq('organization_id', organization.id)
    .maybeSingle();

  if (error || !quote) return new Response('Quote not found', { status:404 });
  const parsed = readQuoteSnapshot(quote.quote_json);
  if (!parsed) return new Response('Unsupported quote snapshot', { status:422 });

  const snapshot = { ...parsed, quoteId:quote.id, quoteVersion:quote.quote_version, issuedAt:quote.issued_at, validUntil:quote.valid_until };
  const buffer = await buildQuotePdf(snapshot);
  const filename = safeFilename(`Makster-Quote-v${quote.quote_version}-${snapshot.project.name}.pdf`);

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
