import { describe, expect, it } from 'vitest';
import { can } from '@/lib/permissions';

describe('can', () => {
   it('lets owners and admins manage clients, projects and invoices', () => {
      for (const role of ['owner', 'admin']) {
         expect(can(role, { client: ['create', 'update', 'archive'] })).toBe(true);
         expect(can(role, { project: ['archive'] })).toBe(true);
         expect(can(role, { invoice: ['read', 'send', 'void'] })).toBe(true);
         expect(can(role, { invitation: ['create'] })).toBe(true);
      }
   });

   it('keeps members away from management and money', () => {
      expect(can('member', { client: ['create'] })).toBe(false);
      expect(can('member', { project: ['update'] })).toBe(false);
      expect(can('member', { invoice: ['read'] })).toBe(false);
      expect(can('member', { invitation: ['create'] })).toBe(false);
   });

   it('only lets owners delete the workspace', () => {
      expect(can('owner', { organization: ['delete'] })).toBe(true);
      expect(can('admin', { organization: ['delete'] })).toBe(false);
   });

   it('needs every requested action', () => {
      expect(can('admin', { organization: ['update'] })).toBe(true);
      expect(can('admin', { organization: ['update', 'delete'] })).toBe(false);
   });

   it('handles combined roles and unknown roles', () => {
      expect(can('member,admin', { invoice: ['send'] })).toBe(true);
      expect(can(' admin ', { invoice: ['send'] })).toBe(true);
      expect(can('superuser', { client: ['create'] })).toBe(false);
      expect(can('', { client: ['create'] })).toBe(false);
   });
});
