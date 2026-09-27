import type { Metadata } from 'next';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow
} from '@/components/ui/table';
import { getMembersOverview } from '@/server/members';
import { requireMembership } from '@/server/organizations';
import { inviteMemberAction } from './actions';
import { CancelInvitationButton, LeaveWorkspaceButton } from './invitation-actions';
import { InviteForm } from './invite-form';
import { MemberActions } from './member-actions';

export async function generateMetadata({
   params
}: PageProps<'/[orgSlug]/settings/members'>): Promise<Metadata> {
   const { organization } = await requireMembership((await params).orgSlug);
   return { title: `Members · ${organization.name}` };
}

const roleBadge = { owner: 'default', admin: 'secondary', member: 'outline' } as const;

// A server component renders the date, so there's no server/browser timezone mismatch.
const formatDate = (date: Date) =>
   new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date);

export default async function MembersPage({ params }: PageProps<'/[orgSlug]/settings/members'>) {
   const { orgSlug } = await params;
   const { organization, members, invitations, canCancelInvitations, assignableRoles } =
      await getMembersOverview(orgSlug);

   return (
      <div className='flex w-full max-w-4xl flex-1 flex-col gap-10 p-6'>
         <div>
            <h1 className='text-2xl font-semibold'>Members</h1>
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
                     <TableHead className='w-10'>
                        <span className='sr-only'>Actions</span>
                     </TableHead>
                  </TableRow>
               </TableHeader>
               <TableBody>
                  {members.map((member) => (
                     <TableRow key={member.id}>
                        <TableCell className='font-medium'>
                           {member.user.name}
                           {member.isMe && <span className='text-muted-foreground'> (you)</span>}
                        </TableCell>
                        <TableCell className='text-muted-foreground'>{member.user.email}</TableCell>
                        <TableCell>
                           <div className='flex gap-1'>
                              {member.role.split(',').map((role) => (
                                 <Badge
                                    key={role}
                                    variant={
                                       roleBadge[role.trim() as keyof typeof roleBadge] ?? 'outline'
                                    }
                                 >
                                    {role.trim()}
                                 </Badge>
                              ))}
                           </div>
                        </TableCell>
                        <TableCell className='text-right text-muted-foreground'>
                           {formatDate(member.createdAt)}
                        </TableCell>
                        <TableCell>
                           <MemberActions
                              orgSlug={organization.slug}
                              member={{ id: member.id, name: member.user.name, role: member.role }}
                              assignableRoles={assignableRoles}
                              canChangeRole={member.canChangeRole}
                              canRemove={member.canRemove}
                           />
                        </TableCell>
                     </TableRow>
                  ))}
               </TableBody>
            </Table>
         </section>

         {/* null = this role may not manage invitations, so neither the form nor the list is shown */}
         {invitations && (
            <Card>
               <CardHeader>
                  <CardTitle>Invite a teammate</CardTitle>
                  <CardDescription>
                     They&apos;ll get an email with a link to join. Invitations expire after 48
                     hours.
                  </CardDescription>
               </CardHeader>
               <CardContent>
                  <InviteForm action={inviteMemberAction.bind(null, organization.slug)} />
               </CardContent>
            </Card>
         )}

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
                           {canCancelInvitations && (
                              <TableHead className='w-10'>
                                 <span className='sr-only'>Actions</span>
                              </TableHead>
                           )}
                        </TableRow>
                     </TableHeader>
                     <TableBody>
                        {invitations.map((invitation) => (
                           <TableRow key={invitation.id}>
                              <TableCell className='font-medium'>{invitation.email}</TableCell>
                              <TableCell>
                                 <Badge variant='outline'>{invitation.role ?? 'member'}</Badge>
                              </TableCell>
                              <TableCell className='text-muted-foreground'>
                                 {invitation.user.name}
                              </TableCell>
                              <TableCell className='text-right text-muted-foreground'>
                                 {formatDate(invitation.expiresAt)}
                              </TableCell>
                              {canCancelInvitations && (
                                 <TableCell className='text-right'>
                                    <CancelInvitationButton
                                       orgSlug={organization.slug}
                                       invitationId={invitation.id}
                                       email={invitation.email}
                                    />
                                 </TableCell>
                              )}
                           </TableRow>
                        ))}
                     </TableBody>
                  </Table>
               )}
            </section>
         )}

         <section className='flex flex-col items-start gap-3 border-t pt-8'>
            <h2 className='font-medium'>Leave workspace</h2>
            <p className='text-sm text-muted-foreground'>
               Remove yourself from {organization.name}. The last owner can&apos;t leave.
            </p>
            <LeaveWorkspaceButton
               orgSlug={organization.slug}
               organizationName={organization.name}
            />
         </section>
      </div>
   );
}
