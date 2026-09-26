import { defaultRoles } from 'better-auth/plugins/organization/access';

// Role-based permissions, using Better Auth's built-in roles:
//   owner  - everything, including deleting the workspace
//   admin  - everything except deleting the workspace
//   member - no management rights (organization, members, invitations)
// Our own resources (clients, invoices, ...) get added to these roles in later phases.
//
// Safe to use anywhere. In the browser it only decides what to *show*; the server always
// checks again before doing anything.

type RoleName = keyof typeof defaultRoles;
type PermissionRequest = Parameters<(typeof defaultRoles)[RoleName]['authorize']>[0];

export const ROLES = ['owner', 'admin', 'member'] as const satisfies readonly RoleName[];

/** can('admin', { invitation: ['create'] }) -> true. A member can hold several roles ("admin,member"). */
export function can(memberRole: string, permissions: PermissionRequest) {
   return memberRole.split(',').some((name) => {
      const role = defaultRoles[name.trim() as RoleName];
      return role ? role.authorize(permissions).success : false;
   });
}
