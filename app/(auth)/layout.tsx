// Shared frame for sign-in and sign-up. "(auth)" is a route group: it groups these pages
// under one layout without adding "/auth" to the URL.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
   return (
      <main className='flex flex-1 items-center justify-center bg-muted px-4 py-16'>
         <div className='w-full max-w-sm'>{children}</div>
      </main>
   );
}
