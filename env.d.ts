// Types for process.env, so the editor autocompletes our variables and flags typos.
// Keep in sync with .env.example. Values are always strings (or missing) at runtime.
declare namespace NodeJS {
   interface ProcessEnv {
      // Database
      TEST_DATABASE_URL: string;

      // Auth (Better Auth)
      BETTER_AUTH_SECRET: string;
      BETTER_AUTH_URL: string;

      // Email (SMTP via Nodemailer)
      SMTP_HOST: string;
      SMTP_PORT: string;
      /** "true" for port 465 (TLS from the start), "false" otherwise */
      SMTP_SECURE: 'true' | 'false';
      /** Empty when the SMTP server needs no login (Mailpit) */
      SMTP_USER?: string;
      SMTP_PASS?: string;
      MAIL_FROM: string;
      /** Stripe secret key (sk_test_... in test mode). Server only. */
      STRIPE_SECRET_KEY: string;
      /** Verifies that webhook calls come from Stripe (whsec_...). */
      STRIPE_WEBHOOK_SECRET: string;
   }
}
