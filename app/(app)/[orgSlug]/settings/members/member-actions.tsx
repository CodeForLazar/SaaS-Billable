'use client';

import { useState, useTransition } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuGroup,
   DropdownMenuItem,
   DropdownMenuLabel,
   DropdownMenuRadioGroup,
   DropdownMenuRadioItem,
   DropdownMenuSeparator,
   DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { removeMemberAction, updateMemberRoleAction } from './actions';

type Role = 'member' | 'admin' | 'owner';
const roleLabels: Record<Role, string> = { member: 'Member', admin: 'Admin', owner: 'Owner' };
const article = (role: string) => (role === 'member' ? 'a' : 'an');

type Props = {
   orgSlug: string;
   member: { id: string; name: string; role: string };
   assignableRoles: readonly Role[];
   canChangeRole: boolean;
   canRemove: boolean;
};

// The "⋯" menu on a member row. Server Actions are called straight from click handlers here
// (no form): startTransition keeps the UI responsive and gives us a pending flag, and after
// the action's refresh() the table re-renders with the new data.
export function MemberActions({
   orgSlug,
   member,
   assignableRoles,
   canChangeRole,
   canRemove
}: Props) {
   const [pending, startTransition] = useTransition();
   const [confirmOpen, setConfirmOpen] = useState(false);
   const currentRole = member.role.split(',')[0].trim();

   if (!canChangeRole && !canRemove) return null;

   function changeRole(role: Role) {
      if (role === currentRole) return;
      startTransition(async () => {
         const result = await updateMemberRoleAction(orgSlug, member.id, role);
         if (result.ok) toast.success(`${member.name} is now ${article(role)} ${role}.`);
         else toast.error(result.message);
      });
   }

   function remove() {
      startTransition(async () => {
         const result = await removeMemberAction(orgSlug, member.id);
         if (result.ok) {
            setConfirmOpen(false);
            toast.success(`${member.name} was removed from the workspace.`);
         } else {
            toast.error(result.message);
         }
      });
   }

   return (
      <>
         <DropdownMenu>
            <DropdownMenuTrigger
               render={
                  <Button
                     variant='ghost'
                     size='icon-sm'
                     aria-label={`Actions for ${member.name}`}
                     disabled={pending}
                  />
               }
            >
               <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-48'>
               {canChangeRole && (
                  <DropdownMenuGroup>
                     <DropdownMenuLabel>Role</DropdownMenuLabel>
                     <DropdownMenuRadioGroup
                        value={currentRole}
                        onValueChange={(value) => changeRole(value as Role)}
                     >
                        {assignableRoles.map((role) => (
                           // closeOnClick: picking a role is a final choice, so close the menu
                           <DropdownMenuRadioItem key={role} value={role} closeOnClick>
                              {roleLabels[role]}
                           </DropdownMenuRadioItem>
                        ))}
                     </DropdownMenuRadioGroup>
                  </DropdownMenuGroup>
               )}
               {canChangeRole && canRemove && <DropdownMenuSeparator />}
               {canRemove && (
                  <DropdownMenuItem variant='destructive' onClick={() => setConfirmOpen(true)}>
                     Remove from workspace
                  </DropdownMenuItem>
               )}
            </DropdownMenuContent>
         </DropdownMenu>

         {/* Destructive, so it asks first. The dialog stays open until the server answers. */}
         <AlertDialog open={confirmOpen} onOpenChange={(open) => !pending && setConfirmOpen(open)}>
            <AlertDialogContent>
               <AlertDialogHeader>
                  <AlertDialogTitle>Remove {member.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                     They&apos;ll lose access to this workspace right away. You can invite them
                     again later.
                  </AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                  <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
                  <AlertDialogAction variant='destructive' onClick={remove} disabled={pending}>
                     {pending ? 'Removing…' : 'Remove'}
                  </AlertDialogAction>
               </AlertDialogFooter>
            </AlertDialogContent>
         </AlertDialog>
      </>
   );
}
