import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse depends on a platform-native canvas binary. Keep both packages
  // external so Vercel's output tracer includes the Linux native dependency.
  serverExternalPackages: ['pdf-parse', '@napi-rs/canvas'],
};

export default nextConfig;
