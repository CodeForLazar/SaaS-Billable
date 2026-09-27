import { invoicePdfResponse } from '@/lib/invoice-pdf';
import { getPublicInvoice } from '@/server/invoices';

// GET /i/<token>/pdf: the public invoice as a PDF, for the client. Same rule as the page: a
// valid token of an issued invoice, else 404.
export async function GET(_request: Request, { params }: RouteContext<'/i/[token]/pdf'>) {
   const found = await getPublicInvoice((await params).token);
   if (!found) return new Response('Not found', { status: 404 });
   return invoicePdfResponse(found.view);
}
