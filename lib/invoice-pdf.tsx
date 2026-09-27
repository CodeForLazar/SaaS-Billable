import 'server-only';
import path from 'node:path';
import { Document, Font, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import { formatDate } from '@/lib/format';
import { DATE_ONLY_ZONE, STATUS_LABELS } from '@/lib/invoice-status';
import type { InvoiceView } from '@/lib/invoice-view';
import { basisPointsToPercent, centsToInput, formatMoney } from '@/lib/money';

// The invoice as a PDF, built with @react-pdf/renderer: React components (<Page>, <View>,
// <Text>) laid out with a subset of CSS (flexbox), rendered to a file on the server. The same
// InvoiceView as the web page, so both always show the same thing.
//
// Font: Noto Sans (lib/fonts, SIL Open Font License), embedded in each PDF. The PDF built-in
// Helvetica would need no files, but it has no Cyrillic (e.g. Macedonian client names) and
// react-pdf gets the width of its "€" wrong (the sign overlapped the digits).
const fonts = path.join(process.cwd(), 'lib', 'fonts');
Font.register({
   family: 'Noto Sans',
   fonts: [
      { src: path.join(fonts, 'NotoSans-Regular.ttf') },
      { src: path.join(fonts, 'NotoSans-Bold.ttf'), fontWeight: 'bold' }
   ]
});
// Words are never hyphenated (react-pdf would otherwise split long names with a "-").
Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
   page: { padding: 48, fontSize: 10, fontFamily: 'Noto Sans', color: '#18181b' },
   row: { flexDirection: 'row', justifyContent: 'space-between' },
   muted: { color: '#71717a' },
   h1: { fontSize: 22, fontWeight: 'bold' },
   bold: { fontWeight: 'bold' },
   section: { marginTop: 28 },
   status: { fontSize: 9, color: '#047857', marginTop: 4 },
   table: { marginTop: 28 },
   th: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#d4d4d8',
      paddingBottom: 6,
      color: '#71717a'
   },
   tr: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#e4e4e7',
      paddingVertical: 8
   },
   description: { flex: 1, paddingRight: 12 },
   number: { width: 70, textAlign: 'right' },
   totals: { marginTop: 16, marginLeft: 'auto', width: 220 },
   totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
   grandTotal: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: '#18181b',
      marginTop: 4,
      paddingTop: 6,
      fontSize: 12,
      fontWeight: 'bold'
   }
});

function InvoicePdf({ invoice }: { invoice: InvoiceView }) {
   const money = (cents: number) => formatMoney(cents, invoice.currency);
   const day = (date: Date | null, fallback: string) =>
      date ? formatDate(date, DATE_ONLY_ZONE) : fallback;
   const title = invoice.number ? `Invoice ${invoice.number}` : 'Draft invoice';

   return (
      <Document title={title} author={invoice.from.name} creator='Billable'>
         <Page size='A4' style={styles.page}>
            <View style={styles.row}>
               <View style={{ maxWidth: 260 }}>
                  <Text style={[styles.bold, { fontSize: 13 }]}>{invoice.from.name}</Text>
                  {invoice.from.address && <Text style={styles.muted}>{invoice.from.address}</Text>}
                  {invoice.from.email && <Text style={styles.muted}>{invoice.from.email}</Text>}
               </View>
               <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.h1}>Invoice</Text>
                  {invoice.number && <Text style={styles.muted}>{invoice.number}</Text>}
                  {invoice.status !== 'sent' && (
                     <Text style={styles.status}>
                        {STATUS_LABELS[invoice.status].toUpperCase()}
                     </Text>
                  )}
               </View>
            </View>

            <View style={[styles.row, styles.section]}>
               <View style={{ maxWidth: 240 }}>
                  <Text style={styles.muted}>Billed to</Text>
                  <Text style={styles.bold}>{invoice.billTo.name}</Text>
                  {invoice.billTo.address && <Text>{invoice.billTo.address}</Text>}
                  {invoice.billTo.email && <Text>{invoice.billTo.email}</Text>}
               </View>
               <View>
                  <Text style={styles.muted}>Issued</Text>
                  <Text>{day(invoice.issueDate, 'When sent')}</Text>
               </View>
               <View>
                  <Text style={styles.muted}>Due</Text>
                  <Text>
                     {day(invoice.dueDate, `${invoice.paymentTermsDays} days after sending`)}
                  </Text>
               </View>
            </View>

            <View style={styles.table}>
               <View style={styles.th}>
                  <Text style={styles.description}>Description</Text>
                  <Text style={styles.number}>Qty</Text>
                  <Text style={styles.number}>Price</Text>
                  <Text style={styles.number}>Amount</Text>
               </View>
               {invoice.lines.map((line) => (
                  // wrap={false}: a line never breaks across two pages
                  <View key={line.id} style={styles.tr} wrap={false}>
                     <Text style={styles.description}>{line.description}</Text>
                     <Text style={styles.number}>{centsToInput(line.quantityHundredths)}</Text>
                     <Text style={styles.number}>{money(line.unitPriceCents)}</Text>
                     <Text style={styles.number}>{money(line.amountCents)}</Text>
                  </View>
               ))}
            </View>

            <View style={styles.totals} wrap={false}>
               <View style={styles.totalRow}>
                  <Text style={styles.muted}>Subtotal</Text>
                  <Text>{money(invoice.subtotalCents)}</Text>
               </View>
               {invoice.taxRateBasisPoints > 0 && (
                  <View style={styles.totalRow}>
                     <Text style={styles.muted}>
                        Tax ({basisPointsToPercent(invoice.taxRateBasisPoints)}%)
                     </Text>
                     <Text>{money(invoice.taxCents)}</Text>
                  </View>
               )}
               <View style={styles.grandTotal}>
                  <Text>Total</Text>
                  <Text>{money(invoice.totalCents)}</Text>
               </View>
            </View>

            {invoice.notes && (
               <View style={styles.section} wrap={false}>
                  <Text style={styles.muted}>Notes</Text>
                  <Text>{invoice.notes}</Text>
               </View>
            )}

            <Text
               style={[
                  styles.muted,
                  { position: 'absolute', bottom: 28, left: 48, right: 48, fontSize: 8 }
               ]}
               render={({ pageNumber, totalPages }) =>
                  `${title} · page ${pageNumber} of ${totalPages}`
               }
               fixed
            />
         </Page>
      </Document>
   );
}

/** The invoice as PDF bytes (for a download response or an email attachment). */
export async function renderInvoicePdf(invoice: InvoiceView) {
   return renderToBuffer(<InvoicePdf invoice={invoice} />);
}

/** "INV-0007.pdf", "draft-invoice.pdf". Characters that can't be in a file name become "-". */
export function invoicePdfFilename(invoice: InvoiceView) {
   return `${(invoice.number ?? 'draft-invoice').replace(/[^A-Za-z0-9._-]/g, '-')}.pdf`;
}

/** The PDF as an HTTP response. `inline`: open in the browser; otherwise download. */
export async function invoicePdfResponse(invoice: InvoiceView, { inline = false } = {}) {
   const pdf = await renderInvoicePdf(invoice);
   return new Response(new Uint8Array(pdf), {
      headers: {
         'Content-Type': 'application/pdf',
         'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${invoicePdfFilename(invoice)}"`,
         // Invoices are private (and drafts change): never store them in shared caches.
         'Cache-Control': 'private, no-store'
      }
   });
}
