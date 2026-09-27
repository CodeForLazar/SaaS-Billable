import { describe, expect, it } from 'vitest';
import { displayStatus } from '@/utils/invoice-status';

// Due dates are calendar dates stored at UTC midnight; "today" is the viewer's calendar day.
const due = (day: string) => new Date(`${day}T00:00:00.000Z`);

describe('displayStatus', () => {
   it('is overdue only when a sent invoice’s due date is before today', () => {
      const invoice = { status: 'SENT' as const, dueDate: due('2026-09-20') };
      expect(displayStatus(invoice, '2026-09-19')).toBe('sent');
      expect(displayStatus(invoice, '2026-09-20')).toBe('sent'); // due today is not late yet
      expect(displayStatus(invoice, '2026-09-21')).toBe('overdue');
   });

   it('never marks paid, void or draft invoices overdue', () => {
      const late = due('2026-01-01');
      expect(displayStatus({ status: 'PAID', dueDate: late }, '2026-09-27')).toBe('paid');
      expect(displayStatus({ status: 'VOID', dueDate: late }, '2026-09-27')).toBe('void');
      expect(displayStatus({ status: 'DRAFT', dueDate: null }, '2026-09-27')).toBe('draft');
   });

   it('depends on the viewer’s day, not the server’s', () => {
      // Due Sep 20. At 23:30 on Sep 20 in New York it's already Sep 21 in UTC.
      const invoice = { status: 'SENT' as const, dueDate: due('2026-09-20') };
      expect(displayStatus(invoice, '2026-09-20')).toBe('sent'); // New York's today
      expect(displayStatus(invoice, '2026-09-21')).toBe('overdue'); // UTC's today
   });
});
