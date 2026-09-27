import Link from 'next/link';
import {
   Building2,
   CreditCard,
   FileText,
   FolderKanban,
   type LucideIcon,
   ShieldCheck,
   Timer
} from 'lucide-react';
import { DemoButton } from '@/components/demo-button';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getSession } from '@/lib/session';
import { site } from '@/lib/site';
import { cn } from '@/lib/utils';

// The public landing page at "/". "Try the demo" is the main call to action: reviewers get a
// workspace full of sample data without signing up. Screenshots come with the README.

const features: { icon: LucideIcon; title: string; description: string }[] = [
   {
      icon: FolderKanban,
      title: 'Clients & projects',
      description: 'Keep every client, project and hourly rate organized in one place.'
   },
   {
      icon: Timer,
      title: 'Time tracking',
      description: 'Start a timer or log hours by hand. Billable time is ready to invoice.'
   },
   {
      icon: FileText,
      title: 'Invoices',
      description: 'Turn tracked hours into a professional invoice and PDF in a few clicks.'
   },
   {
      icon: CreditCard,
      title: 'Online payments',
      description: 'Clients pay by card from a secure link. Invoices are marked paid for you.'
   },
   {
      icon: Building2,
      title: 'Team workspaces',
      description: 'Invite teammates as members or admins and switch between workspaces.'
   },
   {
      icon: ShieldCheck,
      title: 'Secure by default',
      description: 'Verified emails, isolated workspaces and role-based permissions.'
   }
];

export default async function LandingPage() {
   // getSession is cached per request (the layout's header asks too).
   const session = await getSession();

   return (
      <>
         <section className='mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4 py-24 text-center'>
            <p className='rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground'>
               For freelancers and small studios
            </p>
            <h1 className='text-4xl font-semibold tracking-tight text-balance sm:text-5xl'>
               {site.tagline}
            </h1>
            <p className='max-w-xl text-lg text-pretty text-muted-foreground'>{site.description}</p>
            {session ? (
               <Link href='/dashboard' className={cn(buttonVariants({ size: 'lg' }), 'px-6')}>
                  Go to your dashboard
               </Link>
            ) : (
               <div className='flex flex-col items-center gap-3'>
                  {/* Stacked and equally wide on phones, side by side from sm up. */}
                  <div className='flex w-full max-w-xs flex-col items-stretch gap-2 sm:w-auto sm:max-w-none sm:flex-row sm:items-start'>
                     <DemoButton className='w-full px-6' formClassName='w-full sm:w-auto' />
                     <Link
                        href='/sign-up'
                        className={cn(
                           buttonVariants({ variant: 'outline', size: 'lg' }),
                           'w-full px-6 sm:w-auto'
                        )}
                     >
                        Get started for free
                     </Link>
                  </div>
                  <p className='text-sm text-muted-foreground'>
                     The demo opens your own workspace with sample clients, time and invoices. No
                     sign-up needed.
                  </p>
               </div>
            )}
         </section>

         <section className='border-t bg-muted/40'>
            <div className='mx-auto w-full max-w-6xl px-4 py-20'>
               <h2 className='mb-10 text-center text-2xl font-semibold tracking-tight'>
                  Everything you need to get paid for your time
               </h2>
               <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                  {features.map((feature) => (
                     <Card key={feature.title}>
                        <CardHeader>
                           <feature.icon className='mb-2 size-6 text-primary' aria-hidden='true' />
                           <CardTitle>{feature.title}</CardTitle>
                           <CardDescription>{feature.description}</CardDescription>
                        </CardHeader>
                     </Card>
                  ))}
               </div>
            </div>
         </section>
      </>
   );
}
