import { invoicePdfResponse } from '@/lib/invoice-pdf';
import { getInvoiceView } from '@/server/invoices';

// GET /<workspace>/invoices/<id>/pdf: the invoice as a PDF download. A Route Handler (a plain
// HTTP endpoint, like an Express route) because it returns a file, not a page. The same checks
// as the invoice page: signed in, member, invoice rights, this workspace's invoice (else 404).
export async function GET(
   _request: Request,
   { params }: RouteContext<'/[orgSlug]/invoices/[invoiceId]/pdf'>
) {
   const { orgSlug, invoiceId } = await params;
   const { view } = await getInvoiceView(orgSlug, invoiceId);
   return invoicePdfResponse(view);
}
