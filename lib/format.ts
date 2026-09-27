// Display helpers shared by pages. Server Components render these, so there's no server/browser
// timezone mismatch.

/** 27 Sep 2026 -> "Sep 27, 2026" */
export function formatDate(date: Date) {
   return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date);
}
