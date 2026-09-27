import { Skeleton } from '@/components/ui/skeleton';

// Shown while the dashboard's numbers are computed. Safe here: the page itself never calls
// notFound() for anything the workspace layout hasn't already checked (membership).
export default function DashboardLoading() {
   return (
      <div className='flex w-full max-w-6xl flex-1 flex-col gap-6 p-6' aria-busy='true'>
         <div className='flex flex-col gap-2'>
            <Skeleton className='h-8 w-36' />
            <Skeleton className='h-4 w-56' />
         </div>
         <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
            {Array.from({ length: 4 }, (_, i) => (
               <Skeleton key={i} className='h-28 w-full rounded-xl' />
            ))}
         </div>
         <div className='grid gap-4 lg:grid-cols-2'>
            <Skeleton className='h-96 w-full rounded-xl' />
            <Skeleton className='h-64 w-full rounded-xl' />
         </div>
      </div>
   );
}
