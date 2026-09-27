import { createAccessControl } from 'better-auth/plugins/access';
import {
   adminAc,
   defaultStatements,
   memberAc,
   ownerAc
} from 'better-auth/plugins/organization/access';

// Role-based permissions: Better Auth's built-in roles, extended with our own resources.
//   owner  - everything, including deleting the workspace
//   admin  - everything except deleting the workspace
//   member - no management rights; can see clients and projects and track their own time, but
//            not invoices (financial data)
//
// The same roles are passed to Better Auth's organization plugin (lib/auth.ts), so its own checks
// and ours use one definition. Safe to use anywhere. In the browser it only decides what to
// *show*; the server always checks again before doing anything.

const statements = {
   ...defaultStatements, // organization, member, invitation, team, ac (Better Auth's resources)
   client: ['create', 'update', 'archive'],
   project: ['create', 'update', 'archive'],
   invoice: ['read', 'create', 'update', 'send', 'void', 'delete']
} as const;

export const ac = createAccessControl(statements);

const manage = ['create', 'update', 'archive'] as const;
const invoicing = ['read', 'create', 'update', 'send', 'void', 'delete'] as const;

export const roles = {
   owner: ac.newRole({
      ...ownerAc.statements,
      client: manage,
      project: manage,
      invoice: invoicing
   }),
   admin: ac.newRole({
      ...adminAc.statements,
      client: manage,
      project: manage,
      invoice: invoicing
   }),
   member: ac.newRole({ ...memberAc.statements, client: [], project: [], invoice: [] })
};

type RoleName = keyof typeof roles;
type PermissionRequest = Parameters<(typeof roles)[RoleName]['authorize']>[0];

export const ROLES = ['owner', 'admin', 'member'] as const satisfies readonly RoleName[];

/** can('admin', { client: ['create'] }) -> true. A member can hold several roles ("admin,member"). */
export function can(memberRole: string, permissions: PermissionRequest) {
   return memberRole.split(',').some((name) => {
      const role = roles[name.trim() as RoleName];
      return role ? role.authorize(permissions).success : false;
   });
}
