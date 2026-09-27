import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RESERVED_SLUGS, SLUG_MAX_LENGTH, slugify } from '@/utils/slug';

describe('slugify', () => {
   it('makes URL-safe slugs from workspace names', () => {
      expect(slugify('Acme Design & Co.')).toBe('acme-design-co');
      expect(slugify('Café Zürich')).toBe('cafe-zurich');
      expect(slugify('  --Hello   World--  ')).toBe('hello-world');
      expect(slugify('!!!')).toBe('');
   });

   it('cuts long names without leaving a dash at the end', () => {
      const slug = slugify(`${'a'.repeat(SLUG_MAX_LENGTH - 1)} bcd`);
      expect(slug.length).toBeLessThanOrEqual(SLUG_MAX_LENGTH);
      expect(slug.endsWith('-')).toBe(false);
   });
});

// Workspaces live at the root of the site (/<slug>/dashboard), so a workspace must never take
// the name of one of our own top-level routes. This reads app/ and fails when a new route is
// added without reserving its name in utils/slug.ts.
describe('RESERVED_SLUGS', () => {
   function topLevelRoutes(dir: string): string[] {
      return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
         if (entry.name.startsWith('(') && entry.isDirectory()) {
            return topLevelRoutes(join(dir, entry.name)); // route groups don't add a segment
         }
         if (!entry.isDirectory()) return entry.name === 'favicon.ico' ? [entry.name] : [];
         if (entry.name.startsWith('_') || entry.name.startsWith('[')) return []; // private, dynamic
         return [entry.name];
      });
   }

   it('includes every top-level route in app/', () => {
      const routes = topLevelRoutes(join(process.cwd(), 'app'));
      expect(routes.length).toBeGreaterThan(5);
      expect(routes.filter((route) => !RESERVED_SLUGS.has(route))).toEqual([]);
   });
});
