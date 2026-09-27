'use client'; // Error boundaries must be Client Components

import './globals.css';

// Last line of defence: shown only when the root layout itself fails. It *replaces* the root
// layout, so it renders its own <html> and <body> and imports the global styles itself.
// Kept dependency-free on purpose: whatever broke the layout shouldn't break this page too.
export default function GlobalError({
   error,
   retry
}: {
   error: Error & { digest?: string };
   retry: () => void;
}) {
   return (
      <html lang='en'>
         {/* The root layout (which loads the Geist font) is gone here, so use the system font. */}
         <body
            className='flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center'
            style={{ fontFamily: 'system-ui, sans-serif' }}
         >
            <title>Something went wrong</title>
            <h1 className='text-xl font-semibold'>Something went wrong</h1>
            <p className='max-w-md text-sm text-muted-foreground'>
               The app couldn&apos;t load. Please try again in a moment.
            </p>
            {error.digest && (
               <p className='text-xs text-muted-foreground'>
                  Reference: <code>{error.digest}</code>
               </p>
            )}
            <button
               type='button'
               onClick={() => retry()}
               className='rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground'
            >
               Try again
            </button>
         </body>
      </html>
   );
}
