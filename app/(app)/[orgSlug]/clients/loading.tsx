import { Skeleton } from '@/components/ui/skeleton';

// Shown instantly while the clients page loads on the server (Next wraps the page in a Suspense
// boundary with this as the fallback). The sidebar and header stay; only the content area waits.
export default function ClientsLoading() {
   return (
      <div className='flex w-full max-w-5xl flex-1 flex-col gap-6 p-6' aria-busy='true'>
         <div className='flex flex-col gap-2'>
            <Skeleton className='h-8 w-32' />
            <Skeleton className='h-4 w-64' />
         </div>
         <Skeleton className='h-8 w-full max-w-md' />
         <div className='flex flex-col gap-3'>
            {Array.from({ length: 6 }, (_, i) => (
               <Skeleton key={i} className='h-10 w-full' />
            ))}
         </div>
      </div>
   );
}
