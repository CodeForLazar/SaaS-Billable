import { cn } from '@/lib/utils';

// The label/value box on record pages (client, project, ...).
export function DetailList({ children }: { children: React.ReactNode }) {
   return <dl className='flex flex-col gap-4 rounded-lg border p-6 text-sm'>{children}</dl>;
}

/** One row: stacked on phones, side by side from sm up. */
export function Detail({
   label,
   className,
   children
}: {
   label: string;
   className?: string;
   children: React.ReactNode;
}) {
   return (
      <div className='grid gap-1 sm:grid-cols-[10rem_1fr] sm:gap-6'>
         <dt className='text-muted-foreground'>{label}</dt>
         <dd className={cn('min-w-0', className)}>{children}</dd>
      </div>
   );
}
