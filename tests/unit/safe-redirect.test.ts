import { describe, expect, it } from 'vitest';
import { authHref, safeRedirectPath } from '@/utils/safe-redirect';

// ?redirectTo= comes from the URL, so anyone can craft it: only our own paths may pass
// (otherwise a real sign-in link could forward users to a phishing site).
describe('safeRedirectPath', () => {
   it('keeps paths on this site, with query and hash', () => {
      expect(safeRedirectPath('/acme/dashboard')).toBe('/acme/dashboard');
      expect(safeRedirectPath('/accept-invitation/abc?x=1#top')).toBe(
         '/accept-invitation/abc?x=1#top'
      );
   });

   it.each([
      ['an absolute URL', 'https://evil.example'],
      ['a protocol-relative URL', '//evil.example/path'],
      ['a backslash trick', '/\\evil.example'],
      ['a tab inside //', '/\t/evil.example'],
      ['a javascript: URL', 'javascript:alert(1)'],
      ['a relative path', 'dashboard'],
      ['an empty string', '']
   ])('rejects %s', (_label, value) => {
      expect(safeRedirectPath(value)).toBeNull();
   });

   it('rejects anything that is not a string', () => {
      expect(safeRedirectPath(undefined)).toBeNull();
      expect(safeRedirectPath(['/a', '/b'])).toBeNull();
   });

   it('normalizes dot segments instead of leaving the site', () => {
      expect(safeRedirectPath('/../../etc')).toBe('/etc');
   });
});

describe('authHref', () => {
   it('carries the next page and email along', () => {
      expect(authHref('/sign-in', {})).toBe('/sign-in');
      expect(authHref('/sign-up', { redirectTo: '/accept-invitation/x', email: 'a+b@x.com' })).toBe(
         '/sign-up?redirectTo=%2Faccept-invitation%2Fx&email=a%2Bb%40x.com'
      );
   });
});
