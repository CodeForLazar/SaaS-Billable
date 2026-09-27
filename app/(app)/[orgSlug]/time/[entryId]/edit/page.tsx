import type { Metadata } from 'next';
import { getTimeZone } from '@/lib/time-zone';
import { utcToZoned } from '@/lib/zoned-time';
import { requireMembership } from '@/server/organizations';
import { getMyTimeEntry, listTrackableProjects } from '@/server/time-entries';
import { updateTimeEntryAction } from '../../actions';
import { EntryForm } from '../../entry-form';
import { groupProjects } from '../../group-projects';

export async function generateMetadata({
   params
}: PageProps<'/[orgSlug]/time/[entryId]/edit'>): Promise<Metadata> {
   const { organization } = await requireMembership((await params).orgSlug);
   return { title: `Edit time entry · ${organization.name}` };
}

export default async function EditTimeEntryPage({
   params
}: PageProps<'/[orgSlug]/time/[entryId]/edit'>) {
   const { orgSlug, entryId } = await params;
   // 404 inside the shell unless it's one of MY finished entries in this workspace.
   const { organization, entry } = await getMyTimeEntry(orgSlug, entryId);
   const [projects, timeZone] = await Promise.all([
      listTrackableProjects(orgSlug, entry.projectId),
      getTimeZone()
   ]);

   // The stored UTC times, shown on the user's clock.
   const start = utcToZoned(entry.startedAt, timeZone);
   const end = utcToZoned(entry.endedAt ?? entry.startedAt, timeZone);

   return (
      <div className='flex w-full max-w-3xl flex-1 flex-col gap-6 p-6'>
         <div>
            <h1 className='text-2xl font-semibold'>Edit time entry</h1>
            <p className='text-muted-foreground'>Times are in your time zone ({timeZone}).</p>
         </div>
         <EntryForm
            action={updateTimeEntryAction.bind(null, organization.slug, entry.id)}
            groups={groupProjects(projects)}
            defaultValues={{
               projectId: entry.projectId,
               description: entry.description ?? '',
               billable: entry.billable ? 'on' : '',
               date: start.date,
               start: start.time,
               end: end.time
            }}
            submitLabel='Save changes'
            cancelHref={`/${organization.slug}/time`}
         />
      </div>
   );
}
