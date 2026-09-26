import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getMembersOverview } from '@/server/members';
import { requireMembership } from '@/server/organizations';

export async function generateMetadata({ params }: PageProps<'/[orgSlug]/settings/members'>): Promise<Metadata> {
   const { organization } = await requireMembership((await params).orgSlug);
   return { title: `Members · ${organization.name}` };
}

const roleBadge = { owner: 'default', admin: 'secondary', member: 'outline' } as const;

// A server component renders the date, so there's no server/browser timezone mismatch.
const formatDate = (date: Date) => new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date);

export default async function MembersPage({ params }: PageProps<'/[orgSlug]/settings/members'>) {
   const { orgSlug } = await params;
   const { organization, currentUserId, members, invitations } = await getMembersOverview(orgSlug);

   return (
      <main className='mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-16'>
         <div>
            <Link href={`/${organization.slug}/dashboard`} className='text-sm text-muted-foreground hover:underline'>
               ← {organization.name}
            </Link>
            <h1 className='mt-2 text-2xl font-semibold'>Members</h1>
            <p className='text-muted-foreground'>People who have access to this workspace.</p>
         </div>

         <section className='flex flex-col gap-3'>
            <h2 className='font-medium'>Members ({members.length})</h2>
            <Table>
               <TableHeader>
                  <TableRow>
                     <TableHead>Name</TableHead>
                     <TableHead>Email</TableHead>
                     <TableHead>Role</TableHead>
                     <TableHead className='text-right'>Joined</TableHead>
                  </TableRow>
               </TableHeader>
               <TableBody>
                  {members.map((member) => (
                     <TableRow key={member.id}>
                        <TableCell className='font-medium'>
                           {member.user.name}
                           {member.user.id === currentUserId && <span className='text-muted-foreground'> (you)</span>}
                        </TableCell>
                        <TableCell className='text-muted-foreground'>{member.user.email}</TableCell>
                        <TableCell>
                           <div className='flex gap-1'>
                              {member.role.split(',').map((role) => (
                                 <Badge key={role} variant={roleBadge[role.trim() as keyof typeof roleBadge] ?? 'outline'}>
                                    {role.trim()}
                                 </Badge>
                              ))}
                           </div>
                        </TableCell>
                        <TableCell className='text-right text-muted-foreground'>{formatDate(member.createdAt)}</TableCell>
                     </TableRow>
                  ))}
               </TableBody>
            </Table>
         </section>

         {/* null = this role may not manage invitations, so the section isn't shown at all */}
         {invitations && (
            <section className='flex flex-col gap-3'>
               <h2 className='font-medium'>Pending invitations ({invitations.length})</h2>
               {invitations.length === 0 ? (
                  <p className='text-sm text-muted-foreground'>No pending invitations.</p>
               ) : (
                  <Table>
                     <TableHeader>
                        <TableRow>
                           <TableHead>Email</TableHead>
                           <TableHead>Role</TableHead>
                           <TableHead>Invited by</TableHead>
                           <TableHead className='text-right'>Expires</TableHead>
                        </TableRow>
                     </TableHeader>
                     <TableBody>
                        {invitations.map((invitation) => (
                           <TableRow key={invitation.id}>
                              <TableCell className='font-medium'>{invitation.email}</TableCell>
                              <TableCell>
                                 <Badge variant='outline'>{invitation.role ?? 'member'}</Badge>
                              </TableCell>
                              <TableCell className='text-muted-foreground'>{invitation.user.name}</TableCell>
                              <TableCell className='text-right text-muted-foreground'>
                                 {formatDate(invitation.expiresAt)}
                              </TableCell>
                           </TableRow>
                        ))}
                     </TableBody>
                  </Table>
               )}
            </section>
         )}
      </main>
   );
}
