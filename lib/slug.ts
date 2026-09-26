// Workspace URLs live at the root of the site (/acme-design/dashboard), so a slug must never
// be the same as one of our own top-level routes. Keep this list in sync when adding routes to app/.
export const RESERVED_SLUGS = new Set([
   // current routes
   'api',
   'dashboard',
   'sign-in',
   'sign-up',
   'sign-out',
   'check-email',
   'forgot-password',
   'reset-password',
   'create-workspace',
   // planned or likely routes
   'i',
   'invite',
   'invitations',
   'account',
   'settings',
   'admin',
   'app',
   'demo',
   'pricing',
   'about',
   'blog',
   'docs',
   'help',
   'support',
   'terms',
   'privacy',
   'login',
   'logout',
   'register',
   'new',
   'www',
   // files and framework paths
   '_next',
   'static',
   'public',
   'favicon.ico',
   'robots.txt',
   'sitemap.xml'
]);

export const SLUG_MAX_LENGTH = 48;

// "Acme Design & Co." -> "acme-design-co"
export function slugify(text: string) {
   return text
      .normalize('NFKD') // split accented letters: "é" -> "e" + accent
      .replace(/[̀-ͯ]/g, '') // drop the accents
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // anything else becomes a dash
      .replace(/^-+|-+$/g, '') // no dashes at the ends
      .slice(0, SLUG_MAX_LENGTH)
      .replace(/-+$/, ''); // cutting may leave a trailing dash
}
