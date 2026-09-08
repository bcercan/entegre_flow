import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output → minimal Docker runtime image for Coolify.
  output: "standalone",
  // Compile workspace packages consumed by the web app.
  transpilePackages: [
    "@entegreflow/tokens",
    "@entegreflow/contracts",
    "@entegreflow/icons",
    "@entegreflow/ui",
    "@entegreflow/api-client",
  ],
  reactStrictMode: true,
  poweredByHeader: false,
  // The standalone tracer needs the monorepo root to include workspace deps.
  outputFileTracingRoot: __dirname + "/../..",
};

export default nextConfig;
