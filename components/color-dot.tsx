import { cn } from '@/lib/utils';

// A project's label color. Decorative: the name next to it carries the meaning.
export function ColorDot({ color, className }: { color: string | null; className?: string }) {
   return (
      <span
         aria-hidden='true'
         className={cn(
            'inline-block size-2.5 shrink-0 rounded-full bg-muted-foreground',
            className
         )}
         style={color ? { backgroundColor: color } : undefined}
      />
   );
}
