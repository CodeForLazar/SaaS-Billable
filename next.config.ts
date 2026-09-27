import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
   // The invoice PDF reads its font files from disk (lib/invoice-pdf.tsx). A deploy only ships the
   // files the build traced, so name them for the routes that render PDFs: the invoice pages
   // (download + the email attachment, sent by a Server Action there) and the public invoice.
   outputFileTracingIncludes: {
      // Dynamic segments are written with escaped brackets (picomatch reads [] as a character set).
      '/\\[orgSlug\\]/invoices/**': ['./lib/fonts/**'],
      '/i/**': ['./lib/fonts/**']
   }
};

export default nextConfig;
