import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse depends on a platform-native canvas binary. Keep both packages
  // external so Vercel's output tracer includes the Linux native dependency.
  serverExternalPackages: ['pdf-parse', '@napi-rs/canvas'],
  outputFileTracingIncludes: {
    '/api/parse-om': ['./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'],
    '/api/inbox/inbound': ['./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'],
  },
};

export default nextConfig;
