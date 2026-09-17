import { loadPublicQuote } from '@/lib/client-quote-access';
import { buildQuotePdf } from '@/lib/quote-pdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ token:string }> };

function safeFilename(value: string) {
  const normalized = value.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return normalized.slice(0, 80) || 'Makster-Quote.pdf';
}

export async function GET(_request: Request, { params }: Context) {
  const { token } = await params;
  const access = await loadPublicQuote(token);
  if (!access) return new Response('Quote link not found or expired', { status:404 });
  const buffer = await buildQuotePdf(access.snapshot);
  const filename = safeFilename(`Makster-Quote-v${access.quoteVersion}-${access.snapshot.project.name}.pdf`);
  return new Response(new Uint8Array(buffer), {
    headers:{
      'Content-Type':'application/pdf',
      'Content-Disposition':`attachment; filename="${filename}"`,
      'Cache-Control':'private, no-store',
      'Referrer-Policy':'no-referrer',
      'X-Content-Type-Options':'nosniff',
    },
  });
}
