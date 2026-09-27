// How an invoice's status is shown. Safe on the server and in the browser.
//
// "Overdue" is not stored: it's a SENT invoice whose due date (a calendar date) is before today
// on the viewer's calendar.

type StoredStatus = 'DRAFT' | 'SENT' | 'PAID' | 'VOID';
export type DisplayStatus = 'draft' | 'sent' | 'overdue' | 'paid' | 'void';

/** `todayKey` is "YYYY-MM-DD" in the viewer's time zone (dayKey(now, timeZone)). */
export function displayStatus(
   invoice: { status: StoredStatus; dueDate: Date | null },
   todayKey: string
): DisplayStatus {
   if (invoice.status !== 'SENT') return invoice.status.toLowerCase() as DisplayStatus;
   // Due dates are stored as dates at UTC midnight, so their calendar day is the UTC one.
   const due = invoice.dueDate?.toISOString().slice(0, 10);
   return due && due < todayKey ? 'overdue' : 'sent';
}

export const STATUS_LABELS: Record<DisplayStatus, string> = {
   draft: 'Draft',
   sent: 'Sent',
   overdue: 'Overdue',
   paid: 'Paid',
   void: 'Void'
};

/** shadcn Badge variants per status. */
export const STATUS_BADGES: Record<
   DisplayStatus,
   'secondary' | 'outline' | 'default' | 'destructive'
> = {
   draft: 'secondary',
   sent: 'outline',
   overdue: 'destructive',
   paid: 'default',
   void: 'secondary'
};

/** A calendar date stored at UTC midnight -> a Date for date-only formatting (use timeZone 'UTC'). */
export const DATE_ONLY_ZONE = 'UTC';
