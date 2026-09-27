import 'dotenv/config';
import { db } from '../lib/db';
import { demoEmails, seedDemoWorkspace } from '../lib/demo-seed';

// `npm run db:seed`: a demo workspace on your local database, to click around or take
// screenshots. Sign in as demo@example.com / demo-password. Running it again replaces the demo
// (fresh dates, same data). It only ever deletes its own demo: never other users or workspaces.

const KEY = 'demo';
const SLUG = 'maple-street-studio';
const PASSWORD = 'demo-password'; // local only; the public demo uses random passwords
// Working hours are laid out on your computer's clock.
const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

async function main() {
   const emails = demoEmails(KEY);
   // The previous demo: its workspace (everything in it goes too, by cascade), then its users.
   await db.organization.deleteMany({
      where: { slug: SLUG, members: { some: { role: 'owner', user: { email: emails[0] } } } }
   });
   if (await db.organization.findUnique({ where: { slug: SLUG }, select: { id: true } })) {
      throw new Error(`The slug "${SLUG}" belongs to another workspace; not touching it.`);
   }
   await db.user.deleteMany({ where: { email: { in: emails } } });

   const started = performance.now();
   await seedDemoWorkspace(db, { key: KEY, slug: SLUG, password: PASSWORD, timeZone: TIME_ZONE });
   const counts = await db.organization.findUniqueOrThrow({
      where: { slug: SLUG },
      select: {
         _count: { select: { clients: true, projects: true, timeEntries: true, invoices: true } }
      }
   });
   console.log(
      `Demo workspace ready in ${Math.round(performance.now() - started)} ms (${TIME_ZONE}):`,
      counts._count
   );
   console.log(`Sign in as ${emails[0]} / ${PASSWORD}`);
}

main()
   .catch((error) => {
      console.error(error);
      process.exitCode = 1;
   })
   .finally(() => db.$disconnect());
