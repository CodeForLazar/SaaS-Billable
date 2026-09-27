import Form from 'next/form';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { LinkTabs } from '@/components/link-tabs';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { type ListQuery, listHref } from '@/validations/list';

// Building blocks for list pages (clients, projects, ...). All Server Components: they only
// render links and a GET form, and the list's state lives in the URL.

/** Active / Archived switch. Links, not buttons: each state is its own URL. */
export function StatusTabs({ basePath, query }: { basePath: string; query: ListQuery }) {
   const tabs = [
      { status: 'active', label: 'Active' },
      { status: 'archived', label: 'Archived' }
   ] as const;

   return (
      <LinkTabs
         label='Filter by status'
         tabs={tabs.map((tab) => ({
            href: listHref(basePath, query, { status: tab.status, page: 1 }),
            label: tab.label,
            current: query.status === tab.status
         }))}
      />
   );
}

/**
 * next/form: a GET form that updates the URL (?q=...) with client-side navigation. It still works
 * before JavaScript loads. No page field, so a new search starts at page 1; the status is kept.
 */
export function ListSearch({
   basePath,
   query,
   placeholder,
   label
}: {
   basePath: string;
   query: ListQuery;
   placeholder: string;
   label: string;
}) {
   return (
      <Form action={basePath} className='flex w-full max-w-md gap-2'>
         {query.status !== 'active' && <input type='hidden' name='status' value={query.status} />}
         <div className='relative flex-1'>
            <Search
               className='pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground'
               aria-hidden='true'
            />
            <Input
               key={query.q}
               name='q'
               type='search'
               defaultValue={query.q}
               placeholder={placeholder}
               aria-label={label}
               className='pl-8'
            />
         </div>
         <Button type='submit' variant='outline'>
            Search
         </Button>
      </Form>
   );
}

/**
 * "21–40 of 45 clients" + Previous / Next. `pageHref` builds a page's URL, so each list keeps
 * its own filters (a plain function is fine: this is a Server Component, nothing is serialized).
 */
export function ListPagination({
   pageHref,
   page,
   pageCount,
   pageSize,
   total,
   noun
}: {
   pageHref: (page: number) => string;
   page: number;
   pageCount: number;
   pageSize: number;
   total: number;
   noun: [singular: string, plural: string];
}) {
   const pageLink = (target: number, label: string) =>
      target >= 1 && target <= pageCount ? (
         <Link
            href={pageHref(target)}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
         >
            {label}
         </Link>
      ) : (
         <Button variant='outline' size='sm' disabled>
            {label}
         </Button>
      );

   return (
      <nav
         aria-label='Pagination'
         className='flex items-center justify-between gap-4 text-sm text-muted-foreground'
      >
         <p>
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}{' '}
            {total === 1 ? noun[0] : noun[1]}
         </p>
         {pageCount > 1 && (
            <div className='flex items-center gap-2'>
               {pageLink(page - 1, 'Previous')}
               <span>
                  Page {page} of {pageCount}
               </span>
               {pageLink(page + 1, 'Next')}
            </div>
         )}
      </nav>
   );
}
